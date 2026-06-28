import { eq, and, or, desc, isNull, ilike, count, inArray } from "drizzle-orm";
import { task } from "./task.schema";
import { ticket } from "../ticket/ticket.schema";
import { taskComment } from "./task-comment.schema";
import { auditLog } from "../audit-log/audit-log.schema";
import { withTenantTransaction } from "../../infra/db/index";
import { emitEvent } from "../../infra/events";
import { parseMentions } from "../notification/notification.constants";
import { CreateTaskInput, AddTaskCommentInput, UpdateTaskInput } from "@help-desk/shared";

// ABAC: a task may only be managed (status / edit / delete) by its assignee.
// Unassigned tasks stay open so they can be picked up; commenting is never gated.
// Admins bypass this check.
function assertCanManage(t: { assigneeId: string | null }, actorId: string, globalRole?: string) {
  if (globalRole === "SUPER_ADMIN" || globalRole === "ADMIN") return;
  if (t.assigneeId && t.assigneeId !== actorId) {
    throw new Error("Only the task assignee can manage this task.");
  }
}

export const TaskService = {
  findAll: async (
    tenantId: string,
    filters?: { ticketId?: string; assigneeId?: string; standalone?: boolean; search?: string; departmentId?: string; limit?: number; offset?: number }
  ) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const conditions = [eq(task.organizationId, tenantId)];
      if (filters?.ticketId) conditions.push(eq(task.ticketId, filters.ticketId));
      if (filters?.assigneeId) conditions.push(eq(task.assigneeId, filters.assigneeId));
      if (filters?.standalone) conditions.push(isNull(task.ticketId));
      // Department scope: a task belongs to a department via its parent ticket.
      // Standalone tasks (no ticket) are intentionally excluded from a dept view.
      if (filters?.departmentId) {
        conditions.push(
          inArray(
            task.ticketId,
            tx.select({ id: ticket.id }).from(ticket).where(eq(ticket.departmentId, filters.departmentId)),
          ),
        );
      }
      
      let searchFilter;
      if (filters?.search) {
        searchFilter = ilike(task.title, `%${filters.search}%`);
      }
      
      const where = and(...conditions, searchFilter);
      
      const limit = filters?.limit ?? 25;
      const offset = filters?.offset ?? 0;

      const [rows, [{ total }]] = await Promise.all([
        tx.select().from(task).where(where).orderBy(desc(task.createdAt)).limit(limit).offset(offset),
        tx.select({ total: count() }).from(task).where(where),
      ]);

      return { data: rows, total: Number(total), limit, offset };
    });
  },

  findById: async (tenantId: string, taskId: string) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const result = await tx
        .select()
        .from(task)
        .where(and(eq(task.id, taskId), eq(task.organizationId, tenantId)))
        .limit(1);
      return result[0];
    });
  },

  createTask: async (tenantId: string, actorId: string, input: CreateTaskInput) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const newTask = await tx.insert(task).values({
        organizationId: tenantId,
        creatorId: actorId,
        title: input.title,
        description: input.description,
        priority: input.priority || "MEDIUM",
        status: "TODO",
        ticketId: input.ticketId || null,
        parentTaskId: input.parentTaskId || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId || null,
      } as any).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: newTask[0].id,
        actorId: actorId,
        action: "created",
        newValues: newTask[0]
      });

      return newTask[0];
    }).then((created) => {
      // Notify the up-front assignee (skip self-assignment).
      if (created.assigneeId && created.assigneeId !== actorId) {
        emitEvent("task.assigned", { taskId: created.id, assigneeId: created.assigneeId, actorId, organizationId: tenantId });
      }
      // Optional GitHub linkage: enqueue branch creation (network-bound) so the
      // HTTP request returns immediately. Failure here never blocks task creation.
      if (input.githubRepoFullName) {
        import("../github/github.queue")
          .then(({ enqueueGithubLink }) =>
            enqueueGithubLink({
              tenantId,
              taskId: created.id,
              repoFullName: input.githubRepoFullName!,
            }),
          )
          .catch(() => {});
      }
      return created;
    });
  },

  updateStatus: async (tenantId: string, taskId: string, actorId: string, newStatus: string, globalRole?: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx.select().from(task).where(and(eq(task.id, taskId), eq(task.organizationId, tenantId))).limit(1);
      if (!t[0]) throw new Error("Task not found");
      
      assertCanManage(t[0], actorId, globalRole);

      // Subtask Rollup Validation
      if (newStatus === "DONE") {
        const subtasks = await tx.select().from(task).where(eq(task.parentTaskId, taskId));
        const incomplete = subtasks.some(s => s.status !== "DONE" && s.status !== "CANCELED");
        if (incomplete) {
          throw new Error("Cannot mark task as DONE because it has incomplete subtasks.");
        }
      }

      // Stamp completion time on entering a terminal status; clear it on reopen.
      const TERMINAL = newStatus === "DONE" || newStatus === "CANCELED";
      const updated = await tx
        .update(task)
        .set({ status: newStatus, completedAt: TERMINAL ? new Date() : null })
        .where(eq(task.id, taskId))
        .returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: taskId,
        actorId: actorId,
        action: "status_changed",
        oldValues: { status: t[0].status },
        newValues: { status: newStatus }
      });

      return updated[0];
    });
  },

  assignTask: async (tenantId: string, taskId: string, actorId: string, assigneeId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const updated = await tx.update(task).set({ assigneeId }).where(and(eq(task.id, taskId), eq(task.organizationId, tenantId))).returning();
      if (!updated[0]) throw new Error("Task not found");

      // Phase 10: Emit Event
      import("../../infra/events").then(({ emitEvent }) => {
        emitEvent("task.assigned", {
          taskId,
          assigneeId,
          actorId,
          organizationId: tenantId
        });
      });

      return updated[0];
    });
  },

  addComment: async (tenantId: string, taskId: string, actorId: string, input: AddTaskCommentInput) => {
    const comment = await withTenantTransaction(tenantId, async (tx) => {
      // Validate task exists
      const t = await tx.select().from(task).where(and(eq(task.id, taskId), eq(task.organizationId, tenantId))).limit(1);
      if (!t[0]) throw new Error("Task not found");

      const inserted = await tx.insert(taskComment).values({
        taskId: taskId,
        authorId: actorId,
        content: input.content
      }).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: taskId,
        actorId: actorId,
        action: "comment_added",
        newValues: { commentId: inserted[0].id },
      });

      return inserted[0];
    });

    // @mention notifications (post-commit).
    for (const mentionedUserId of parseMentions(input.content)) {
      emitEvent("comment.mention", {
        entityType: "task",
        entityId: taskId,
        mentionedUserId,
        actorId,
        organizationId: tenantId,
      });
    }

    return comment;
  },

  getComments: async (tenantId: string, taskId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: task.id })
        .from(task)
        .where(and(eq(task.id, taskId), eq(task.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Task not found");

      return tx
        .select()
        .from(taskComment)
        .where(eq(taskComment.taskId, taskId))
        .orderBy(desc(taskComment.createdAt));
    });
  },

  getSubtasks: async (tenantId: string, taskId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx
        .select({ id: task.id })
        .from(task)
        .where(and(eq(task.id, taskId), eq(task.organizationId, tenantId)))
        .limit(1);
      if (!t[0]) throw new Error("Task not found");

      return tx
        .select()
        .from(task)
        .where(and(eq(task.parentTaskId, taskId), eq(task.organizationId, tenantId)))
        .orderBy(desc(task.createdAt));
    });
  },

  updateTask: async (tenantId: string, taskId: string, actorId: string, input: UpdateTaskInput, globalRole?: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const current = await tx.select().from(task).where(and(eq(task.id, taskId), eq(task.organizationId, tenantId))).limit(1);
      const t = current[0];
      if (!t) throw new Error("Task not found");
      assertCanManage(t, actorId, globalRole);

      if (input.parentTaskId === taskId) throw new Error("A task cannot be its own parent");

      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (input.ticketId !== undefined) patch.ticketId = input.ticketId;
      if (input.parentTaskId !== undefined) patch.parentTaskId = input.parentTaskId;

      const updated = await tx.update(task).set(patch).where(eq(task.id, taskId)).returning();

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: taskId,
        actorId,
        action: "updated",
        oldValues: {
          title: t.title,
          description: t.description,
          priority: t.priority,
          dueDate: t.dueDate,
          ticketId: t.ticketId,
          parentTaskId: t.parentTaskId,
        },
        newValues: patch,
      });

      return updated[0];
    });
  },

  deleteTask: async (tenantId: string, taskId: string, actorId: string, globalRole?: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const t = await tx.select().from(task).where(and(eq(task.id, taskId), eq(task.organizationId, tenantId))).limit(1);
      if (!t[0]) throw new Error("Task not found");
      assertCanManage(t[0], actorId, globalRole);

      // Subtasks and comments cascade via FK onDelete.
      await tx.delete(task).where(eq(task.id, taskId));

      await tx.insert(auditLog).values({
        organizationId: tenantId,
        entityType: "task",
        entityId: taskId,
        actorId,
        action: "deleted",
        oldValues: t,
      });

      return { id: taskId };
    });
  }
};

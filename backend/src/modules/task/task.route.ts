import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { TaskService } from "./task.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import {
  createTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  addTaskCommentSchema,
  updateTaskSchema,
} from "@help-desk/shared";

export const taskRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload };
}>()
  .use("*", authMiddleware())
  .get("/", requirePermission("task.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const user = c.get("user");
    try {
      const query = c.req.query();
      const limit = Math.min(Number(query.limit) || 25, 100);
      const offset = Number(query.offset) || 0;

      // Workspace scope guard — mirrors the ticket list endpoint.
      //   scope=personal    → only tasks assigned to the current user
      //   scope=dept:<uuid> → tasks whose ticket is in that department; members
      //                       (or org admins) only.
      let assigneeId = query.assigneeId;
      let departmentId: string | undefined;
      const scope = query.scope;
      const isOrgAdmin = user.globalRole === "ADMIN" || user.globalRole === "SUPER_ADMIN";
      if (scope === "personal") {
        assigneeId = user.userId;
      } else if (scope?.startsWith("dept:")) {
        departmentId = scope.slice("dept:".length);
        if (!isOrgAdmin && !(user.departmentIds ?? []).includes(departmentId)) {
          return ResponseHandler.forbidden(c, "Not a member of this department");
        }
      }

      const tasks = await TaskService.findAll(tenantId, {
        ticketId: query.ticketId,
        assigneeId,
        standalone: query.standalone === "true",
        search: query.search,
        departmentId,
        limit,
        offset,
      });
      return ResponseHandler.ok(c, tasks);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/:id", requirePermission("task.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const id = c.req.param("id") as string;
    try {
      const t = await TaskService.findById(tenantId, id);
      if (!t) return ResponseHandler.notFound(c, "Task not found");
      return ResponseHandler.ok(c, t);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .post(
    "/",
    requirePermission("task.create"),
    zValidator("json", createTaskSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const data = c.req.valid("json");

      try {
        const task = await TaskService.createTask(tenantId, user.userId, data);
        return ResponseHandler.created(c, task, "Task created");
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .put(
    "/:id/status",
    requirePermission("task.update"),
    zValidator("json", updateTaskStatusSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      try {
        const task = await TaskService.updateStatus(
          tenantId,
          id,
          user.userId,
          data.status,
          user.globalRole
        );
        return ResponseHandler.success(c, task, {
          message: "Task status updated",
          meta: {
            status: data.status,
          },
          status: 200,
        });
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .put(
    "/:id/assign",
    requirePermission("task.assign"),
    zValidator("json", assignTaskSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      try {
        const task = await TaskService.assignTask(
          tenantId,
          id,
          user.userId,
          data.assigneeId,
        );
        return ResponseHandler.success(c, task, {
          message: "Task assigned",
          meta: {
            assigneeId: data.assigneeId,
          },
          status: 200,
        });
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .post(
    "/:id/comments",
    requirePermission("task.reply"),
    zValidator("json", addTaskCommentSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      try {
        const comment = await TaskService.addComment(
          tenantId,
          id,
          user.userId,
          data,
        );
        return ResponseHandler.created(c, comment, "Comment added");
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .get("/:id/comments", requirePermission("task.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const comments = await TaskService.getComments(tenantId, id);
      return ResponseHandler.ok(c, comments);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .get("/:id/subtasks", requirePermission("task.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const subtasks = await TaskService.getSubtasks(tenantId, id);
      return ResponseHandler.ok(c, subtasks);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  })
  .patch(
    "/:id",
    requirePermission("task.update"),
    zValidator("json", updateTaskSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");
      try {
        const task = await TaskService.updateTask(tenantId, id, user.userId, data, user.globalRole);
        return ResponseHandler.ok(c, task);
      } catch (err: any) {
        return ResponseHandler.badRequest(c, err.message);
      }
    },
  )
  .delete("/:id", requirePermission("task.delete"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const result = await TaskService.deleteTask(tenantId, id, user.userId, user.globalRole);
      return ResponseHandler.ok(c, result);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

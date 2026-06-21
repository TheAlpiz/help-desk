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
    try {
      const tasks = await TaskService.findAll(tenantId, {
        ticketId: c.req.query("ticketId"),
        assigneeId: c.req.query("assigneeId"),
        standalone: c.req.query("standalone") === "true",
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
        const task = await TaskService.updateTask(tenantId, id, user.userId, data);
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
      const result = await TaskService.deleteTask(tenantId, id, user.userId);
      return ResponseHandler.ok(c, result);
    } catch (err: any) {
      return ResponseHandler.badRequest(c, err.message);
    }
  });

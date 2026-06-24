import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { TicketService } from "./ticket.service";
import { AssignmentService } from "./assignment.service";
import { ResponseHandler } from "../../lib/response";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import {
  createTicketSchema,
  updateTicketStatusSchema,
  addMessageSchema,
  assignTicketSchema,
  mergeTicketSchema,
  updatePrioritySchema,
  updateTicketSchema,
  linkTicketSchema,
  addTagSchema,
  addCcSchema,
} from "@help-desk/shared";

export const ticketRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload; permissions: string[] };
}>()
  .use("*", authMiddleware())
  .get("/", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const user = c.get("user");
    const query = c.req.query();
    const limit = Math.min(Number(query.limit) || 25, 100);
    const offset = Number(query.offset) || 0;
    const status = query.status || undefined;
    const priority = query.priority || undefined;
    const search = query.search || undefined;
    const assigneeId = query.assigneeId || undefined;
    const unassigned = query.unassigned || undefined;
    try {
      const result = await TicketService.findAll(
        tenantId,
        { userId: user.userId, departmentIds: user.departmentIds ?? [], permissions: c.get("permissions") ?? [] },
        { limit, offset, status, priority, search, assigneeId, unassigned },
      );
      return ResponseHandler.ok(c, result);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/:id", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const id = c.req.param("id") as string;
    const user = c.get("user");
    try {
      const t = await TicketService.findById(tenantId, id, {
        userId: user.userId,
        departmentIds: user.departmentIds ?? [],
        permissions: c.get("permissions") ?? [],
      });
      if (!t) return ResponseHandler.notFound(c, "Ticket not found");
      return ResponseHandler.ok(c, t);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/:id/messages", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const id = c.req.param("id") as string;
    try {
      const messages = await TicketService.getMessages(tenantId, id);
      return ResponseHandler.ok(c, messages);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post(
    "/",
    requirePermission("ticket.create"),
    zValidator("json", createTicketSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const data = c.req.valid("json");

      try {
        const ticket = await TicketService.createTicket(
          tenantId,
          user.userId,
          data,
        );
        return ResponseHandler.created(
          c,
          ticket,
          "Ticket created successfully",
        );
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .post(
    "/:id/messages",
    requirePermission("ticket.reply"),
    zValidator("json", addMessageSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");

      try {
        const message = await TicketService.addMessage(
          tenantId,
          id,
          user.userId,
          data,
        );
        return ResponseHandler.created(
          c,
          message,
          "Message added successfully",
        );
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .put(
    "/:id/status",
    requirePermission("ticket.update"),
    zValidator("json", updateTicketStatusSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");

      try {
        const ticket = await TicketService.updateStatus(
          tenantId,
          id,
          user.userId,
          data.status,
        );
        return ResponseHandler.success(c, ticket, {
          message: `Ticket status updated to ${data.status} successfully`,
          meta: { status: data.status },
          status: 200,
        });
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .put(
    "/:id/assign",
    requirePermission("ticket.assign"),
    zValidator("json", assignTicketSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");

      try {
        const ticket = await TicketService.assignTicket(
          tenantId,
          id,
          user.userId,
          data.assigneeId,
        );
        return ResponseHandler.success(c, ticket, {
          message: `Ticket assigned to user ${data.assigneeId} successfully`,
          meta: { assigneeId: data.assigneeId },
          status: 200,
        });
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  // Auto-assign by availability: picks the best eligible agent (active-duty first,
  // never "not available", load-balanced) and assigns the ticket to them.
  .post("/:id/auto-assign", requirePermission("ticket.assign"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const assigneeId = await AssignmentService.pickForTicket(tenantId, id);
      if (!assigneeId) {
        return ResponseHandler.badRequest(c, "No available agent to assign");
      }
      const ticket = await TicketService.assignTicket(tenantId, id, user.userId, assigneeId);
      return ResponseHandler.success(c, ticket, { meta: { assigneeId }, status: 200 });
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post(
    "/:id/merge",
    requirePermission("ticket.merge"),
    zValidator("json", mergeTicketSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");

      try {
        const link = await TicketService.mergeTickets(
          tenantId,
          id,
          data.targetTicketId,
          user.userId,
        );
        return ResponseHandler.success(c, link, {
          message: "Ticket merged successfully",
          meta: { targetTicketId: data.targetTicketId },
          status: 200,
        });
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .put(
    "/:id/priority",
    requirePermission("ticket.update"),
    zValidator("json", updatePrioritySchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");

      try {
        const t = await TicketService.updatePriority(tenantId, id, user.userId, data.priority);
        return ResponseHandler.success(c, t, {
          message: `Ticket priority updated to ${data.priority}`,
          meta: { priority: data.priority },
          status: 200,
        });
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .patch(
    "/:id",
    requirePermission("ticket.update"),
    zValidator("json", updateTicketSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");
      try {
        const t = await TicketService.updateTicket(tenantId, id, user.userId, data);
        return ResponseHandler.ok(c, t);
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .post("/:id/reopen", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const t = await TicketService.reopenTicket(tenantId, id, user.userId);
      return ResponseHandler.success(c, t, { message: "Ticket reopened", status: 200 });
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/:id/history", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const history = await TicketService.getHistory(tenantId, id);
      return ResponseHandler.ok(c, history);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .get("/:id/links", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    const id = c.req.param("id") as string;
    try {
      const links = await TicketService.getLinks(tenantId, id);
      return ResponseHandler.ok(c, links);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })
  .post(
    "/:id/links",
    requirePermission("ticket.update"),
    zValidator("json", linkTicketSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");
      try {
        const link = await TicketService.linkTickets(
          tenantId,
          id,
          data.targetTicketId,
          data.linkType,
          user.userId,
        );
        return ResponseHandler.created(c, link, "Tickets linked successfully");
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .get("/:id/tags", requirePermission("ticket.read"), async (c) => {
    const tenantId = c.get("tenantId");
    if (!tenantId) return ResponseHandler.unauthorized(c, "Tenant ID required");
    const id = c.req.param("id") as string;
    try {
      const tags = await TicketService.getTags(tenantId, id);
      return ResponseHandler.ok(c, tags);
    } catch (error: any) {
      if (error.message === "Ticket not found") return ResponseHandler.notFound(c, error.message);
      return ResponseHandler.internalServerError(c, error.message);
    }
  })
  .post(
    "/:id/tags",
    requirePermission("ticket.update"),
    zValidator("json", addTagSchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const user = c.get("user");
      const id = c.req.param("id") as string;
      const data = c.req.valid("json");
      try {
        const tag = await TicketService.addTag(tenantId, id, data.name, user.userId);
        return ResponseHandler.created(c, tag, "Tag added successfully");
      } catch (error: any) {
        return ResponseHandler.badRequest(c, error.message);
      }
    },
  )
  .delete("/:id/tags/:tagId", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const tagId = c.req.param("tagId") as string;
    try {
      const removed = await TicketService.removeTag(tenantId, id, tagId, user.userId);
      return ResponseHandler.ok(c, removed);
    } catch (error: any) {
      return ResponseHandler.badRequest(c, error.message);
    }
  })

  .post("/:id/cc", requirePermission("ticket.update"), zValidator("json", addCcSchema), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    try {
      const { email } = c.req.valid("json");
      const updated = await TicketService.addCc(tenantId, id, email, user.userId);
      return ResponseHandler.ok(c, updated);
    } catch (error: any) {
      return ResponseHandler.internalServerError(c, error.message);
    }
  })

  .delete("/:id/cc/:email", requirePermission("ticket.update"), async (c) => {
    const tenantId = c.get("tenantId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const email = decodeURIComponent(c.req.param("email") as string);
    try {
      const updated = await TicketService.removeCc(tenantId, id, email, user.userId);
      return ResponseHandler.ok(c, updated);
    } catch (error: any) {
      return ResponseHandler.internalServerError(c, error.message);
    }
  });

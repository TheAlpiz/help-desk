import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, JwtPayload } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { ResponseHandler } from "../../lib/response";
import { ExportService } from "./export.service";
import { toCSV, toJSON, toXLSX } from "./export.serializer";

const ENTITIES = ["tickets", "tasks", "users", "audit_logs", "sla_reports"] as const;
type ExportEntity = (typeof ENTITIES)[number];

const ENTITY_SHEET_NAMES: Record<ExportEntity, string> = {
  tickets: "Tickets",
  tasks: "Tasks",
  users: "Users",
  audit_logs: "Audit Logs",
  sla_reports: "SLA Reports",
};

const exportQuerySchema = z.object({
  format: z.enum(["csv", "json", "xlsx"]).default("csv"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const exportRouter = new Hono<{
  Variables: { tenantId: string; user: JwtPayload };
}>()
  .use("*", authMiddleware())
  .get(
    "/:entity",
    requirePermission("export.read"),
    zValidator("query", exportQuerySchema),
    async (c) => {
      const tenantId = c.get("tenantId");
      const entity = c.req.param("entity") as string;
      const { format, from, to } = c.req.valid("query");

      // Validate entity param
      if (!ENTITIES.includes(entity as ExportEntity)) {
        return ResponseHandler.badRequest(
          c,
          `Invalid export entity "${entity}". Allowed: ${ENTITIES.join(", ")}`,
        );
      }

      const filters = { from, to };

      try {
        // Fetch data based on entity type
        let data: Record<string, unknown>[];
        switch (entity as ExportEntity) {
          case "tickets":
            data = await ExportService.exportTickets(tenantId, filters);
            break;
          case "tasks":
            data = await ExportService.exportTasks(tenantId, filters);
            break;
          case "users":
            data = await ExportService.exportUsers(tenantId, filters);
            break;
          case "audit_logs":
            data = await ExportService.exportAuditLogs(tenantId, filters);
            break;
          case "sla_reports":
            data = await ExportService.exportSlaReports(tenantId, filters);
            break;
          default:
            return ResponseHandler.badRequest(c, "Unknown entity");
        }

        // Serialize to the requested format
        const filename = `${entity}-export-${new Date().toISOString().slice(0, 10)}`;
        let serialized;

        switch (format) {
          case "csv":
            serialized = toCSV(data);
            break;
          case "json":
            serialized = toJSON(data);
            break;
          case "xlsx":
            serialized = await toXLSX(data, ENTITY_SHEET_NAMES[entity as ExportEntity]);
            break;
          default:
            return ResponseHandler.badRequest(c, "Unsupported format");
        }

        // Return as a file download
        c.header("Content-Type", serialized.contentType);
        c.header(
          "Content-Disposition",
          `attachment; filename="${filename}.${serialized.extension}"`,
        );

        return c.body(serialized.buffer as any);
      } catch (err: any) {
        return ResponseHandler.internalServerError(
          c,
          `Export failed: ${err.message}`,
        );
      }
    },
  );

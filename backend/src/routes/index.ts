import { Hono } from "hono";
import { OrganizationRouter } from "../modules/organization";
import { UserRouter } from "../modules/user";
import { RoleRouter } from "../modules/role";
import { PermissionRouter } from "../modules/permission";
import { DepartmentRouter } from "../modules/department";
import { MailboxRouter } from "../modules/mailbox";
import { TicketRouter } from "../modules/ticket";
import { TaskRouter } from "../modules/task";
import { SlaRouter, SlaEscalationRuleRouter } from "../modules/sla";
import { AuditLogRouter } from "../modules/audit-log";
import { AuthRouter } from "../modules/auth";
import { AnalyticsRouter } from "../modules/analytics";
import { NotificationRouter } from "../modules/notification";
import { AttachmentRouter } from "../modules/attachment";
import { MacroRouter } from "../modules/macro";
import { AutomationRouter } from "../modules/automation";

const router = new Hono()
  .route("/auths", AuthRouter)
  .route("/auditLogs", AuditLogRouter)
  .route("/slas", SlaRouter)
  .route("/sla-escalation-rules", SlaEscalationRuleRouter)
  .route("/tasks", TaskRouter)
  .route("/tickets", TicketRouter)
  .route("/mailboxes", MailboxRouter)
  .route("/departments", DepartmentRouter)
  .route("/permissions", PermissionRouter)
  .route("/roles", RoleRouter)
  .route("/users", UserRouter)
  .route("/organizations", OrganizationRouter)
  .route("/analytics", AnalyticsRouter)
  .route("/notifications", NotificationRouter)
  .route("/attachments", AttachmentRouter)
  .route("/macros", MacroRouter)
  .route("/automations", AutomationRouter);

export default router;

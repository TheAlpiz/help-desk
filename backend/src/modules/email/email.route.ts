import { Hono } from "hono";
import { emailController } from "./email.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/permission.middleware";
import { zValidator } from "@hono/zod-validator";
import {
  emailBrandingSchema,
  createEmailTemplateSchema,
  saveTemplateVersionSchema,
  createEmailSignatureSchema,
  saveSignatureVersionSchema,
} from "@help-desk/shared";

const app = new Hono();

// Branding
app.get("/branding", authMiddleware(), (c) => emailController.getBranding(c));
app.put("/branding", authMiddleware(), requirePermission("manage_branding"), zValidator("json", emailBrandingSchema), (c) => emailController.updateBranding(c));

// Templates
app.get("/templates", authMiddleware(), (c) => emailController.listTemplates(c));
app.get("/templates/:type/active", authMiddleware(), (c) => emailController.getActiveTemplate(c));
app.post("/templates/:id/versions", authMiddleware(), requirePermission("manage_templates"), zValidator("json", saveTemplateVersionSchema), (c) => emailController.saveTemplateVersion(c));

// Signatures
app.get("/signatures", authMiddleware(), (c) => emailController.listSignatures(c));
app.get("/signatures/search", authMiddleware(), (c) => emailController.getSignature(c));
app.post("/signatures", authMiddleware(), requirePermission("manage_signatures"), zValidator("json", createEmailSignatureSchema), (c) => emailController.createSignature(c));
app.get("/signatures/:id", authMiddleware(), requirePermission("manage_signatures"), (c) => emailController.getSignatureById(c));
app.post("/signatures/:id/versions", authMiddleware(), requirePermission("manage_signatures"), zValidator("json", saveSignatureVersionSchema), (c) => emailController.saveSignatureVersion(c));

export default app;

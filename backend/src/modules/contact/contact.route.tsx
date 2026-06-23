import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sendPlatformEmail } from "../../infra/mailer";
import { ResponseHandler } from "../../lib/response";
import { env } from "../../infra/env";
import { logger } from "../../infra/logger";
import { render } from "@react-email/render";
import { ContactEmail } from "./contact.email";
import React from "react";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(1, "Message is required"),
  language: z.enum(["en", "tr"]).default("en"),
});

const ContactRouter = new Hono()
  .post("/", zValidator("json", contactSchema), async (c) => {
  const { firstName, lastName, email, message, language } = c.req.valid("json");
  
  const subjectEn = `New Contact Form Submission from ${firstName} ${lastName}`;
  const subjectTr = `${firstName} ${lastName} adlı kişiden yeni İletişim Formu Bildirimi`;
  const subject = language === "tr" ? subjectTr : subjectEn;
  
  const html = await render(
    <ContactEmail 
      firstName={firstName} 
      lastName={lastName} 
      email={email} 
      message={message} 
      language={language}
    />
  );

  try {
    await sendPlatformEmail({
      from: "info@yerliva.com",
      to: "support@yerliva.com",
      subject,
      html,
    });
    return ResponseHandler.success(c, { message: "Email sent successfully" });
  } catch (error) {
    logger.error(error, "Failed to send contact email");
    return ResponseHandler.internalServerError(c, "Failed to send email");
  }
});

export { ContactRouter };

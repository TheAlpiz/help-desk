import { eq, sql } from "drizzle-orm";
import { db } from "../../infra/db";
import { emailSend, emailClickEvent } from "./email.schema";

// ── HTML injection ────────────────────────────────────────────────────────────

const TRACKING_PIXEL_HTML = (baseUrl: string, trackingId: string) =>
  `<img src="${baseUrl}/api/email/track/open/${trackingId}.png" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;

const wrapLink = (href: string, baseUrl: string, trackingId: string) =>
  `${baseUrl}/api/email/track/click/${trackingId}?url=${encodeURIComponent(href)}`;

export function injectTracking(html: string, trackingId: string, baseUrl: string): string {
  // Rewrite all <a href="..."> links to click-tracking URLs
  const withLinks = html.replace(
    /<a\s+([^>]*?)href="([^"]+)"([^>]*?)>/gi,
    (match, before, href, after) => {
      // Don't wrap already-wrapped tracking links or mailto/tel
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.includes("/api/email/track/")) {
        return match;
      }
      const tracked = wrapLink(href, baseUrl, trackingId);
      return `<a ${before}href="${tracked}"${after}>`;
    },
  );

  // Inject 1x1 tracking pixel before </body>
  const pixel = TRACKING_PIXEL_HTML(baseUrl, trackingId);
  if (withLinks.includes("</body>")) {
    return withLinks.replace("</body>", `${pixel}</body>`);
  }
  return withLinks + pixel;
}

// ── Event recorders ───────────────────────────────────────────────────────────

export async function recordOpen(trackingId: string): Promise<void> {
  await db
    .update(emailSend)
    .set({
      openCount: sql`${emailSend.openCount} + 1`,
      openedAt: sql`COALESCE(${emailSend.openedAt}, NOW())`,
    })
    .where(eq(emailSend.trackingId, trackingId));
}

export async function recordClick(
  trackingId: string,
  originalUrl: string,
  userAgent?: string,
  ipHash?: string,
): Promise<void> {
  const [send] = await db
    .select({ id: emailSend.id })
    .from(emailSend)
    .where(eq(emailSend.trackingId, trackingId))
    .limit(1);

  if (!send) return;

  await Promise.all([
    db.insert(emailClickEvent).values({
      sendId: send.id,
      originalUrl,
      userAgent: userAgent ?? null,
      ipHash: ipHash ?? null,
    }),
    db
      .update(emailSend)
      .set({
        clickCount: sql`${emailSend.clickCount} + 1`,
        lastClickedAt: sql`NOW()`,
      })
      .where(eq(emailSend.id, send.id)),
  ]);
}

// ── Analytics query ───────────────────────────────────────────────────────────

export async function getEmailAnalytics(
  organizationId: string,
  options?: { templateType?: string; fromDate?: Date; toDate?: Date },
) {
  const rows = await db
    .select({
      templateType: emailSend.templateType,
      total: sql<number>`COUNT(*)::int`,
      opens: sql<number>`COUNT(${emailSend.openedAt})::int`,
      clicks: sql<number>`SUM(${emailSend.clickCount})::int`,
      uniqueOpens: sql<number>`COUNT(CASE WHEN ${emailSend.openCount} > 0 THEN 1 END)::int`,
    })
    .from(emailSend)
    .where(eq(emailSend.organizationId, organizationId))
    .groupBy(emailSend.templateType);

  return rows;
}

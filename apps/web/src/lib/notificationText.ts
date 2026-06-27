import i18n from "@/i18n/config";

/**
 * Notification title/body are stored in English on the backend. Localize at
 * render time off the event `type` (dotted, e.g. "ticket.created"), falling
 * back to the stored string when no translation exists for that type.
 *
 * Shared by the notifications page, the header bell dropdown, and realtime
 * toasts so all three surfaces read in the user's language. Uses the global
 * i18n instance (current language at call time); callers that need to react to
 * language changes already subscribe via `useTranslation`, which re-renders and
 * re-invokes these.
 */
export function notifTypeLabel(type: string | undefined): string {
  if (!type) return i18n.t("notifications:types.notification");
  return i18n.t(`notifications:messages.${type}.label`, {
    defaultValue: i18n.t(`notifications:types.${type}`, { defaultValue: type }),
  });
}

export function notifTitle(n: { type?: string; title?: string } | undefined): string {
  return i18n.t(`notifications:messages.${n?.type}.title`, {
    defaultValue: n?.title || notifTypeLabel(n?.type),
  });
}

export function notifBody(
  n: { type?: string; body?: string; message?: string; payload?: { message?: string } } | undefined,
): string {
  return i18n.t(`notifications:messages.${n?.type}.body`, {
    defaultValue: n?.body ?? n?.message ?? n?.payload?.message ?? "",
  });
}

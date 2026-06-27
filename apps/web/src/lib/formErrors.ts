import i18n from "@/i18n/config";

/**
 * Shared Zod schemas emit i18n keys (e.g. "validation.email") as their error
 * messages so the same contract can be localised on the frontend. Resolve a key
 * through i18next; if it isn't a known key the original string passes through
 * unchanged (so raw server/API messages still render).
 */
function translateMessage(msg: string): string {
  return i18n.t(msg, { defaultValue: msg });
}

/**
 * Extract human-readable error messages from TanStack Form's field error array.
 *
 * With Zod v4 + latest @tanstack/react-form, `field.state.meta.errors` contains
 * objects (e.g. `{ message: "..." }`) rather than plain strings.  Calling
 * `.join()` or `.toString()` on those objects produces the infamous
 * "[object Object]" text.
 *
 * This helper normalises both shapes into a single comma-separated string
 * (or `undefined` when there are no errors) so it can be dropped straight
 * into `<FormError>`. Each message is run through i18next so validation keys
 * become localised text.
 */
export function fieldErrors(errors: unknown[] | undefined): string | undefined {
  if (!errors || errors.length === 0) return undefined;

  const msgs = errors
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object" && "message" in e)
        return (e as { message: string }).message;
      return String(e);
    })
    .filter(Boolean)
    .map((m) => translateMessage(m as string));

  return msgs.length > 0 ? msgs.join(", ") : undefined;
}

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
 * into `<FormError>`.
 */
export function fieldErrors(
  errors: unknown[] | undefined,
): string | undefined {
  if (!errors || errors.length === 0) return undefined;

  const msgs = errors
    .map((e) => {
      if (typeof e === "string") return e;
      if (e && typeof e === "object" && "message" in e)
        return (e as { message: string }).message;
      return String(e);
    })
    .filter(Boolean);

  return msgs.length > 0 ? msgs.join(", ") : undefined;
}

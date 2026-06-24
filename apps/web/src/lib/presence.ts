// Discord-style availability presentation. Keep the keys in sync with
// @help-desk/shared AVAILABILITY_STATUSES.

export type Availability =
  | "active_duty"
  | "available"
  | "away"
  | "do_not_disturb"
  | "not_available";

export const AVAILABILITY_ORDER: Availability[] = [
  "active_duty",
  "available",
  "away",
  "do_not_disturb",
  "not_available",
];

type Meta = {
  labelKey: string; // i18n key under nav:presence
  fallback: string; // English fallback
  dot: string; // tailwind bg-* for the status dot
  text: string; // tailwind text-* for labels
};

export const AVAILABILITY_META: Record<Availability, Meta> = {
  active_duty: { labelKey: "presence.active_duty", fallback: "Active Duty", dot: "bg-emerald-500", text: "text-emerald-400" },
  available: { labelKey: "presence.available", fallback: "Available", dot: "bg-green-500", text: "text-green-400" },
  away: { labelKey: "presence.away", fallback: "Away", dot: "bg-amber-500", text: "text-amber-400" },
  do_not_disturb: { labelKey: "presence.do_not_disturb", fallback: "Do Not Disturb", dot: "bg-rose-500", text: "text-rose-400" },
  not_available: { labelKey: "presence.not_available", fallback: "Not Available", dot: "bg-zinc-500", text: "text-zinc-400" },
};

export function availabilityMeta(a?: string | null): Meta {
  return AVAILABILITY_META[(a as Availability) ?? "available"] ?? AVAILABILITY_META.available;
}

/** Dot color for a user: gray when offline, availability color when online. */
export function presenceDot(online: boolean, availability?: string | null): string {
  if (!online) return "bg-zinc-600";
  return availabilityMeta(availability).dot;
}

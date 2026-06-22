export type BhDayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface BhDaySchedule {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface BusinessHoursConfig {
  timezone: string;
  days: Record<BhDayName, BhDaySchedule>;
}

function getTzOffsetMins(date: Date, tz: string): number {
  const utcMs = new Date(date.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const tzMs  = new Date(date.toLocaleString("en-US", { timeZone: tz  })).getTime();
  return (utcMs - tzMs) / 60000;
}

// UTC instant for HH:MM on the same calendar day as `date` in `tz`
function getWindowBoundary(date: Date, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const localDay = date.toLocaleDateString("en-CA", { timeZone: tz }); // "YYYY-MM-DD"
  const [y, mo, d] = localDay.split("-").map(Number);
  const fakeMidnightUtc = new Date(Date.UTC(y, mo - 1, d));
  const offset = getTzOffsetMins(fakeMidnightUtc, tz);
  return new Date(fakeMidnightUtc.getTime() + offset * 60000 + (h * 60 + m) * 60000);
}

// Midnight of next calendar day in tz, as UTC
function nextCalendarDay(date: Date, tz: string): Date {
  const localDay = date.toLocaleDateString("en-CA", { timeZone: tz });
  const [y, mo, d] = localDay.split("-").map(Number);
  const fakeTomorrowUtc = new Date(Date.UTC(y, mo - 1, d + 1));
  const offset = getTzOffsetMins(fakeTomorrowUtc, tz);
  return new Date(fakeTomorrowUtc.getTime() + offset * 60000);
}

/**
 * Add `minutesToAdd` of business minutes to `start`.
 * Falls through disabled days and time outside configured windows.
 * Guard of 5000 iterations caps at ~13 years of daily iteration.
 */
export function addBusinessMinutes(
  start: Date,
  minutesToAdd: number,
  config: BusinessHoursConfig,
): Date {
  let remaining = minutesToAdd;
  let cur = new Date(start.getTime());

  for (let guard = 0; guard < 5000 && remaining > 0; guard++) {
    const dayName = cur.toLocaleDateString("en-US", {
      timeZone: config.timezone,
      weekday: "long",
    }) as BhDayName;

    const sched = config.days[dayName];

    if (!sched?.enabled) {
      cur = nextCalendarDay(cur, config.timezone);
      continue;
    }

    const winStart = getWindowBoundary(cur, sched.start, config.timezone);
    const winEnd   = getWindowBoundary(cur, sched.end,   config.timezone);

    if (cur.getTime() < winStart.getTime()) { cur = winStart; continue; }
    if (cur.getTime() >= winEnd.getTime())  { cur = nextCalendarDay(cur, config.timezone); continue; }

    const minsLeft = (winEnd.getTime() - cur.getTime()) / 60000;
    if (remaining <= minsLeft) {
      return new Date(cur.getTime() + remaining * 60000);
    }
    remaining -= minsLeft;
    cur = nextCalendarDay(cur, config.timezone);
  }

  return cur;
}

/**
 * Add `days` of business days to `start` (each business day = full open window).
 */
export function addBusinessDays(
  start: Date,
  daysToAdd: number,
  config: BusinessHoursConfig,
): Date {
  if (daysToAdd <= 0) return start;

  let remaining = daysToAdd;
  let cur = new Date(start.getTime());

  for (let guard = 0; guard < 5000 && remaining > 0; guard++) {
    cur = nextCalendarDay(cur, config.timezone);
    const dayName = cur.toLocaleDateString("en-US", {
      timeZone: config.timezone,
      weekday: "long",
    }) as BhDayName;

    if (config.days[dayName]?.enabled) remaining--;
  }

  // Return start of the resolved business day's window
  const dayName = cur.toLocaleDateString("en-US", {
    timeZone: config.timezone,
    weekday: "long",
  }) as BhDayName;
  const sched = config.days[dayName];
  return sched?.enabled ? getWindowBoundary(cur, sched.start, config.timezone) : cur;
}

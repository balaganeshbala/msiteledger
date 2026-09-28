function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Returns the Sunday (YYYY-MM-DD) of the week containing dateStr. */
export function getWeekStartDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const day = date.getDay(); // 0 = Sunday
  date.setDate(date.getDate() - day);
  return formatDate(date);
}

/** Returns the 7 dates (Sun..Sat) of the week starting at weekStartDate. */
export function getWeekDates(weekStartDate: string): string[] {
  const start = parseDate(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return formatDate(dt);
  });
}

export function todayDateString(): string {
  return formatDate(new Date());
}

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export interface WeekTotals {
  totalSalary: number;
  totalAdvance: number;
  /** Lump sum handed to the worker on Saturday for this week. */
  netPayable: number;
}

export function computeWeekTotals(
  logs: { dailySalary: number; extraAdvance: number }[]
): WeekTotals {
  const totalSalary = logs.reduce((sum, l) => sum + l.dailySalary, 0);
  const totalAdvance = logs.reduce((sum, l) => sum + l.extraAdvance, 0);
  return { totalSalary, totalAdvance, netPayable: totalSalary - totalAdvance };
}

/**
 * The most that can still be advanced today without pushing this week's
 * Saturday payout below zero. Weeks don't carry a balance to/from each
 * other, so this only ever looks at salary already earned within the same
 * week (today included) — not at days later in the week that may never be
 * worked.
 */
export function maxAdvanceToday(
  otherWeekLogs: { dailySalary: number; extraAdvance: number }[],
  todaysSalary: number
): number {
  const { totalSalary, totalAdvance } = computeWeekTotals(otherWeekLogs);
  return Math.max(0, totalSalary + todaysSalary - totalAdvance);
}

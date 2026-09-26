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

export interface ComputedEntry {
  dailySalary: number;
  totalCashPaid: number;
  runningBalance: number;
}

/**
 * Work Day Rule: today's earned salary first pays down any outstanding
 * advance debt (a negative balance); only the leftover, if any, plus any
 * new advance given today is actually handed to the worker.
 * Non-Work Day Rule: only the advance is paid out, salary earned is 0.
 * negative balance = advance owed by labour; it never exceeds zero, since
 * any salary beyond what's needed to clear the debt is paid out in cash
 * instead of carrying forward as a positive (wage-owed) balance.
 */
export function computeEntry(
  workedToday: boolean,
  dailyRate: number,
  extraAdvance: number,
  previousBalance: number
): ComputedEntry {
  const dailySalary = workedToday ? dailyRate : 0;
  const outstandingDebt = previousBalance < 0 ? -previousBalance : 0;
  const paidTowardsDebt = Math.min(dailySalary, outstandingDebt);
  const totalCashPaid = dailySalary - paidTowardsDebt + extraAdvance;
  const runningBalance = previousBalance + paidTowardsDebt - extraAdvance;
  return { dailySalary, totalCashPaid, runningBalance };
}

/** A record has no cash impact and should not be persisted. */
export function isZeroActivity(workedToday: boolean, extraAdvance: number) {
  return !workedToday && (!extraAdvance || extraAdvance === 0);
}

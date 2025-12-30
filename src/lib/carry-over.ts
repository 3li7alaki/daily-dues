import { format, subDays, getDay } from "date-fns";

export interface CarryOverResult {
  carryOver: number;
  totalDue: number;
}

/**
 * Calculate carry-over punishment for a commitment
 * Formula: missed * multiplier
 *
 * The TOTAL due next day = carry_over + daily_target
 *
 * Example: If you miss 10 pushups today with 2x multiplier:
 * - Carry-over (punishment): 10 * 2 = 20
 * - Next day total: 20 + 10 (daily) = 30 pushups
 */
export function calculateCarryOver(
  missed: number,
  multiplier: number
): number {
  if (missed <= 0) return 0;
  return Math.round(missed * multiplier);
}

/**
 * Check if a date is a work day based on active days array
 * Day numbers: 0 = Sunday, 1 = Monday, ... 6 = Saturday
 * Bahrain default: [0, 1, 2, 3, 4] (Sunday-Thursday)
 */
export function isWorkDay(date: Date, activeDays: number[]): boolean {
  return activeDays.includes(getDay(date));
}

/**
 * Get the previous work day
 */
export function getPreviousWorkDay(date: Date, activeDays: number[]): Date | null {
  let checkDate = subDays(date, 1);
  let attempts = 0;

  while (attempts < 7) {
    if (isWorkDay(checkDate, activeDays)) {
      return checkDate;
    }
    checkDate = subDays(checkDate, 1);
    attempts++;
  }

  return null;
}

/**
 * Format date for database (YYYY-MM-DD)
 */
export function formatDateForDb(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Bahrain work days (Sunday-Thursday)
 */
export const BAHRAIN_WORK_DAYS = [0, 1, 2, 3, 4];

/**
 * Day names for display
 */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

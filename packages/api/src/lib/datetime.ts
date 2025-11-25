/**
 * Europe/Paris Business Time Utilities
 *
 * This module provides utilities for formatting and parsing dates/times
 * following the Europe/Paris business time strategy.
 *
 * IMPORTANT: The VTC ERP treats all DateTime values as naive Europe/Paris
 * business times. NO timezone conversion is performed when storing or
 * retrieving values. The time entered by the operator is the time stored
 * and displayed.
 *
 * @see docs/bmad/prd.md#FR40
 * @see docs/bmad/tech-spec.md - Date & Time Strategy
 */

/**
 * Timezone constant - Europe/Paris only
 * Used for documentation purposes, NOT for conversion
 */
export const TIMEZONE = "Europe/Paris" as const;

/**
 * Locale for French date/time formatting
 */
export const DATETIME_LOCALE = "fr-FR" as const;

/**
 * Intl.DateTimeFormat for full datetime: "15/06/2025 14:30"
 */
const dateTimeFormatter = new Intl.DateTimeFormat(DATETIME_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Intl.DateTimeFormat for date only: "15/06/2025"
 */
const dateFormatter = new Intl.DateTimeFormat(DATETIME_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Intl.DateTimeFormat for time only: "14:30"
 */
const timeFormatter = new Intl.DateTimeFormat(DATETIME_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Intl.DateTimeFormat for long date: "15 juin 2025"
 */
const longDateFormatter = new Intl.DateTimeFormat(DATETIME_LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Intl.DateTimeFormat for full long datetime: "15 juin 2025 à 14:30"
 */
const longDateTimeFormatter = new Intl.DateTimeFormat(DATETIME_LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Convert input to Date object
 * Handles Date, string (ISO format), null, and undefined
 */
function toDate(input: Date | string | null | undefined): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (input instanceof Date) {
    return input;
  }

  // Parse ISO string - JavaScript will interpret without offset as local time
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

/**
 * Format a datetime to French format: "15/06/2025 14:30"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted string or empty string if invalid
 *
 * @example
 * formatParisDateTime(new Date("2025-06-15T14:30:00")) // "15/06/2025 14:30"
 * formatParisDateTime("2025-06-15T14:30:00") // "15/06/2025 14:30"
 * formatParisDateTime(null) // ""
 */
export function formatParisDateTime(
  date: Date | string | null | undefined
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }
  return dateTimeFormatter.format(d);
}

/**
 * Format a date to French format: "15/06/2025"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted string or empty string if invalid
 *
 * @example
 * formatParisDate(new Date("2025-06-15T14:30:00")) // "15/06/2025"
 * formatParisDate("2025-06-15") // "15/06/2025"
 */
export function formatParisDate(
  date: Date | string | null | undefined
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }
  return dateFormatter.format(d);
}

/**
 * Format a time to 24-hour format: "14:30"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted string or empty string if invalid
 *
 * @example
 * formatParisTime(new Date("2025-06-15T14:30:00")) // "14:30"
 * formatParisTime("2025-06-15T09:05:00") // "09:05"
 */
export function formatParisTime(
  date: Date | string | null | undefined
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }
  return timeFormatter.format(d);
}

/**
 * Format a date to long French format: "15 juin 2025"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted string or empty string if invalid
 *
 * @example
 * formatParisDateLong(new Date("2025-06-15")) // "15 juin 2025"
 */
export function formatParisDateLong(
  date: Date | string | null | undefined
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }
  return longDateFormatter.format(d);
}

/**
 * Format a datetime to long French format: "15 juin 2025 à 14:30"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted string or empty string if invalid
 *
 * @example
 * formatParisDateTimeLong(new Date("2025-06-15T14:30:00")) // "15 juin 2025 à 14:30"
 */
export function formatParisDateTimeLong(
  date: Date | string | null | undefined
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }
  return longDateTimeFormatter.format(d);
}

/**
 * Parse a French datetime string to Date: "15/06/2025 14:30" -> Date
 *
 * @param input - French format datetime string "DD/MM/YYYY HH:mm"
 * @returns Date object
 * @throws Error if input is not a valid datetime string
 *
 * @example
 * parseParisDateTime("15/06/2025 14:30") // Date for 2025-06-15 14:30
 * parseParisDateTime("01/12/2025 09:05") // Date for 2025-12-01 09:05
 */
export function parseParisDateTime(input: string): Date {
  if (!input || input.trim() === "") {
    throw new Error("Invalid datetime: empty input");
  }

  // Expected format: "DD/MM/YYYY HH:mm"
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
  const match = input.trim().match(regex);

  if (!match) {
    throw new Error(`Invalid datetime format: "${input}". Expected "DD/MM/YYYY HH:mm"`);
  }

  const [, day, month, year, hour, minute] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1; // JavaScript months are 0-indexed
  const y = parseInt(year, 10);
  const h = parseInt(hour, 10);
  const min = parseInt(minute, 10);

  // Validate ranges
  if (m < 0 || m > 11) {
    throw new Error(`Invalid month: ${month}`);
  }
  if (d < 1 || d > 31) {
    throw new Error(`Invalid day: ${day}`);
  }
  if (h < 0 || h > 23) {
    throw new Error(`Invalid hour: ${hour}`);
  }
  if (min < 0 || min > 59) {
    throw new Error(`Invalid minute: ${minute}`);
  }

  const date = new Date(y, m, d, h, min, 0, 0);

  // Verify the date is valid (handles invalid dates like 31/02)
  if (date.getDate() !== d || date.getMonth() !== m || date.getFullYear() !== y) {
    throw new Error(`Invalid date: "${input}"`);
  }

  return date;
}

/**
 * Parse a French date string to Date: "15/06/2025" -> Date
 *
 * @param input - French format date string "DD/MM/YYYY"
 * @returns Date object (time set to 00:00:00)
 * @throws Error if input is not a valid date string
 *
 * @example
 * parseParisDate("15/06/2025") // Date for 2025-06-15 00:00
 */
export function parseParisDate(input: string): Date {
  if (!input || input.trim() === "") {
    throw new Error("Invalid date: empty input");
  }

  // Expected format: "DD/MM/YYYY"
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = input.trim().match(regex);

  if (!match) {
    throw new Error(`Invalid date format: "${input}". Expected "DD/MM/YYYY"`);
  }

  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  const y = parseInt(year, 10);

  // Validate ranges
  if (m < 0 || m > 11) {
    throw new Error(`Invalid month: ${month}`);
  }
  if (d < 1 || d > 31) {
    throw new Error(`Invalid day: ${day}`);
  }

  const date = new Date(y, m, d, 0, 0, 0, 0);

  // Verify the date is valid
  if (date.getDate() !== d || date.getMonth() !== m || date.getFullYear() !== y) {
    throw new Error(`Invalid date: "${input}"`);
  }

  return date;
}

/**
 * Parse a time string to hours and minutes: "14:30" -> { hours: 14, minutes: 30 }
 *
 * @param input - Time string "HH:mm"
 * @returns Object with hours and minutes
 * @throws Error if input is not a valid time string
 *
 * @example
 * parseParisTime("14:30") // { hours: 14, minutes: 30 }
 * parseParisTime("09:05") // { hours: 9, minutes: 5 }
 */
export function parseParisTime(input: string): { hours: number; minutes: number } {
  if (!input || input.trim() === "") {
    throw new Error("Invalid time: empty input");
  }

  // Expected format: "HH:mm"
  const regex = /^(\d{2}):(\d{2})$/;
  const match = input.trim().match(regex);

  if (!match) {
    throw new Error(`Invalid time format: "${input}". Expected "HH:mm"`);
  }

  const [, hour, minute] = match;
  const h = parseInt(hour, 10);
  const min = parseInt(minute, 10);

  if (h < 0 || h > 23) {
    throw new Error(`Invalid hour: ${hour}`);
  }
  if (min < 0 || min > 59) {
    throw new Error(`Invalid minute: ${minute}`);
  }

  return { hours: h, minutes: min };
}

/**
 * Convert a Date to ISO string without timezone offset
 * Returns format: "YYYY-MM-DDTHH:mm:ss"
 *
 * This is used for API communication to avoid timezone conversion.
 * The value represents the local business time.
 *
 * @param date - Date object
 * @returns ISO-like string without offset
 *
 * @example
 * toISOStringNoOffset(new Date(2025, 5, 15, 14, 30, 0)) // "2025-06-15T14:30:00"
 */
export function toISOStringNoOffset(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Convert a Date to date-only ISO string: "YYYY-MM-DD"
 *
 * @param date - Date object
 * @returns Date string in ISO format
 *
 * @example
 * toISODateString(new Date(2025, 5, 15)) // "2025-06-15"
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Check if a value is a valid Date
 *
 * @param date - Value to check
 * @returns true if valid Date, false otherwise
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if a string is a valid French datetime format
 *
 * @param input - String to validate
 * @returns true if valid "DD/MM/YYYY HH:mm" format
 */
export function isValidParisDateTimeString(input: string): boolean {
  try {
    parseParisDateTime(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid French date format
 *
 * @param input - String to validate
 * @returns true if valid "DD/MM/YYYY" format
 */
export function isValidParisDateString(input: string): boolean {
  try {
    parseParisDate(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Combine a date and time into a single Date object
 *
 * @param date - Date object or ISO date string
 * @param time - Time string "HH:mm"
 * @returns Combined Date object
 *
 * @example
 * combineDateAndTime(new Date("2025-06-15"), "14:30")
 * // Date for 2025-06-15 14:30:00
 */
export function combineDateAndTime(
  date: Date | string,
  time: string
): Date {
  const d = toDate(date);
  if (!d) {
    throw new Error("Invalid date");
  }

  const { hours, minutes } = parseParisTime(time);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

/**
 * Get relative time description in French
 *
 * @param date - Date to compare
 * @param baseDate - Base date for comparison (defaults to now)
 * @returns French relative time string
 *
 * @example
 * getRelativeTime(yesterday) // "hier"
 * getRelativeTime(tomorrow) // "demain"
 */
export function getRelativeTime(
  date: Date | string,
  baseDate: Date = new Date()
): string {
  const d = toDate(date);
  if (!d) {
    return "";
  }

  const diffMs = d.getTime() - baseDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "aujourd'hui";
  } else if (diffDays === 1) {
    return "demain";
  } else if (diffDays === -1) {
    return "hier";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `dans ${diffDays} jours`;
  } else if (diffDays < -1 && diffDays >= -7) {
    return `il y a ${Math.abs(diffDays)} jours`;
  }

  // Fall back to formatted date
  return formatParisDate(d);
}

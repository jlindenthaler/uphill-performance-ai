import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Format a date in the user's timezone
 */
export function formatDateInUserTimezone(
  date: Date | string, 
  userTimezone: string = 'UTC', 
  formatString: string = 'MMM d, yyyy'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, userTimezone, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date and time in the user's timezone
 */
export function formatDateTimeInUserTimezone(
  date: Date | string,
  userTimezone: string = 'UTC',
  formatString: string = 'MMM d, yyyy HH:mm'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, userTimezone, formatString);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid date';
  }
}

/**
 * Convert a local date to the user's timezone
 */
export function toUserTimezone(date: Date | string, userTimezone: string = 'UTC'): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, userTimezone);
  } catch (error) {
    console.error('Error converting to user timezone:', error);
    return new Date();
  }
}

/**
 * Convert a date from the user's timezone to UTC
 */
export function fromUserTimezone(date: Date | string, userTimezone: string = 'UTC'): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return fromZonedTime(dateObj, userTimezone);
  } catch (error) {
    console.error('Error converting from user timezone:', error);
    return new Date();
  }
}

/**
 * Get the current date in the user's timezone
 */
export function getCurrentDateInUserTimezone(userTimezone: string = 'UTC'): Date {
  return toUserTimezone(new Date(), userTimezone);
}

/**
 * Format activity date with consideration for timezone
 */
export function formatActivityDate(
  activityDate: Date | string,
  userTimezone: string = 'UTC'
): string {
  return formatDateInUserTimezone(activityDate, userTimezone, 'MMM d, yyyy');
}

/**
 * Format activity datetime with consideration for timezone
 */
export function formatActivityDateTime(
  activityDate: Date | string,
  userTimezone: string = 'UTC'
): string {
  return formatDateTimeInUserTimezone(activityDate, userTimezone, 'MMM d, yyyy HH:mm');
}
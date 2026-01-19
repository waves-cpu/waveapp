import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatFns } from 'date-fns';
import { id } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatToWIB(date: Date | string | number, formatString: string, p0?: unknown): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // Get original UTC timestamp
  const originalTime = dateObj.getTime();

  // Get client's timezone offset in milliseconds from UTC.
  const localOffsetInMs = dateObj.getTimezoneOffset() * 60 * 1000;
  
  // WIB is UTC+7, so its offset in milliseconds is +7 hours.
  const wibOffsetInMs = 7 * 60 * 60 * 1000;

  // Create a new timestamp that is adjusted to show WIB time in the user's local timezone.
  // We add the WIB offset and the user's local offset to the original UTC time.
  const adjustedTime = originalTime + wibOffsetInMs + localOffsetInMs;
  
  const adjustedDate = new Date(adjustedTime);

  return formatFns(adjustedDate, formatString, { locale: id });
}

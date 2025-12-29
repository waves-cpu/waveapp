import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatFns } from 'date-fns';
import { id } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatToWIB(date: Date | string | number, formatString: string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // Create a new date object with the same time value to avoid modifying the original
  const localDate = new Date(dateObj.getTime());
  
  // Get the timezone offset in minutes and convert it to milliseconds
  const timezoneOffset = localDate.getTimezoneOffset() * 60000;
  
  // Adjust to UTC by adding the offset, then add the WIB offset (7 hours)
  const wibTime = localDate.getTime() + timezoneOffset + (7 * 3600 * 1000);
  
  const wibDate = new Date(wibTime);
  
  return formatFns(wibDate, formatString, { locale: id });
}

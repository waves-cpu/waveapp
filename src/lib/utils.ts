import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as formatFns, addHours } from 'date-fns';
import { id } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatToWIB(date: Date | string | number, formatString: string, p0?: unknown): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // Directly add 7 hours to the UTC date to get WIB
  const wibDate = addHours(dateObj, 7);

  return formatFns(wibDate, formatString, { locale: id });
}

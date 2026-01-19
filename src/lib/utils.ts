import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { id } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Utility untuk menggabungkan class Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Memformat tanggal apa pun ke Waktu Indonesia Barat (WIB)
 * @param date - Tanggal (Date object, ISO string, atau timestamp)
 * @param formatString - Format tujuan (contoh: 'dd MMMM yyyy, HH:mm')
 * @returns string tanggal terformat dalam zona waktu Asia/Jakarta
 */
export function formatToWIB(
  date: Date | string | number, 
  formatString: string = 'PPP' // Default ke format tanggal panjang
): string {
  if (!date) return '';

  try {
    const timeZone = 'Asia/Jakarta';
    
    return formatInTimeZone(date, timeZone, formatString, { 
      locale: id 
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return '';
  }
}

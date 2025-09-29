
'use client';

import { useCallback } from 'react';
import type { InvoiceData } from '@/app/components/reseller-invoice';

declare global {
  interface Window {
    html2pdf: any;
  }
}

const SCRIPT_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
let scriptPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (scriptPromise) {
    return scriptPromise;
  }
  
  scriptPromise = new Promise((resolve, reject) => {
    // If script is already loaded, resolve immediately.
    if (window.html2pdf) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // Reset promise on error to allow retries
      reject(new Error('Failed to load html2pdf.js script.'));
    };
    
    document.head.appendChild(script);
  });
  
  return scriptPromise;
};


export function useInvoicePDF() {
  const generatePDF = useCallback(async (invoiceData: InvoiceData) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await loadScript();
    } catch (error: any) {
       console.error(error.message);
       // Optionally, show a toast to the user
       // toast({ variant: 'destructive', title: 'Print Error', description: 'Could not load printing library. Please try again.' });
       return;
    }

    const element = document.getElementById(`invoice-${invoiceData.transactionId}`);
    if (!element) {
        console.error('Invoice element not found');
        return;
    }

    const options = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     `invoice-${invoiceData.transactionId.slice(-8)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: true, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().from(element).set(options).save();
  }, []);

  return { generatePDF };
}

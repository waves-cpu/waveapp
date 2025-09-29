
'use client';

import { useCallback } from 'react';
import type { InvoiceData } from '@/app/components/reseller-invoice';

declare global {
  interface Window {
    html2pdf: any;
  }
}

const checkHtml2Pdf = (resolve: () => void, reject: (reason?: any) => void, maxRetries = 10, interval = 300) => {
  if (window.html2pdf) {
    resolve();
  } else if (maxRetries > 0) {
    setTimeout(() => checkHtml2Pdf(resolve, reject, maxRetries - 1, interval), interval);
  } else {
    reject(new Error('html2pdf is not loaded after multiple retries.'));
  }
};

export function useInvoicePDF() {
  const generatePDF = useCallback(async (invoiceData: InvoiceData) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => checkHtml2Pdf(resolve, reject));
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

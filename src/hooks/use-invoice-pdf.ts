
'use client';

import { useCallback } from 'react';
import type { InvoiceData } from '@/app/components/reseller-invoice';

declare global {
  interface Window {
    html2pdf: any;
  }
}

export function useInvoicePDF() {
  const generatePDF = useCallback((invoiceData: InvoiceData) => {
    if (typeof window === 'undefined' || !window.html2pdf) {
      console.error('html2pdf is not loaded');
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

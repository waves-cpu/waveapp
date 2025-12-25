
'use client';

import { useCallback } from 'react';
import type { InvoiceData } from '@/app/components/reseller-invoice';
import { useToast } from './use-toast';

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
  const { toast } = useToast();

  const generatePDF = useCallback(async (invoiceData: InvoiceData) => {
    if (typeof window === 'undefined') {
      return;
    }

    const { toast: toastRef } = toast({ title: 'Memulai unduhan', description: 'Invoice PDF sedang disiapkan...' });

    try {
      await loadScript();
    } catch (error: any) {
       console.error(error.message);
       toastRef.update({
           id: toastRef.id,
           title: 'Gagal Mencetak',
           description: 'Gagal memuat pustaka cetak. Silakan coba lagi.',
           variant: 'destructive'
       });
       return;
    }

    const element = document.getElementById(`invoice-${invoiceData.transactionId}`);
    if (!element) {
        console.error('Invoice element not found');
        return;
    }

    const fileName = `invoice-${invoiceData.transactionId.slice(-8)}.pdf`;
    const options = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: true, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().from(element).set(options).save().then(() => {
        toastRef.update({
            id: toastRef.id,
            title: "Unduhan Siap",
            description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
        });
    });
  }, [toast]);

  return { generatePDF };
}

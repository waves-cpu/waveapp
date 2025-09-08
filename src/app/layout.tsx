
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from './components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language';
import { InventoryProvider } from '@/hooks/use-inventory';
import { ReceiptSettingsProvider } from '@/hooks/use-receipt-settings';
import { InvoiceSettingsProvider } from '@/hooks/use-invoice-settings';

export const metadata: Metadata = {
  title: 'WaveApp',
  description: 'Smart Inventory Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      </head>
      <body className="font-body antialiased h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <InventoryProvider>
                <ReceiptSettingsProvider>
                  <InvoiceSettingsProvider>
                    {children}
                  </InvoiceSettingsProvider>
                </ReceiptSettingsProvider>
            </InventoryProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

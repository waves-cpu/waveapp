

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from './components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language';
import { InventoryProvider } from '@/hooks/use-inventory';
import { ReceiptSettingsProvider } from '@/hooks/use-receipt-settings';
import { InvoiceSettingsProvider } from '@/hooks/use-invoice-settings';
import { FinanceSettingsProvider } from '@/hooks/use-finance-settings';
import { AuthProvider } from '@/hooks/use-auth';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Waveblast',
  description: 'Smart Inventory Management',
  manifest: '/manifest.json'
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
        {/* The script is now loaded dynamically by the hook, so we remove it from here. */}
      </head>
      <body className="font-body antialiased h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <InventoryProvider>
                  <ReceiptSettingsProvider>
                    <InvoiceSettingsProvider>
                      <FinanceSettingsProvider>
                        {children}
                      </FinanceSettingsProvider>
                    </InvoiceSettingsProvider>
                  </ReceiptSettingsProvider>
              </InventoryProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

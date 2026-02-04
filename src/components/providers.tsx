'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/query-client';
import { ThemeProvider } from '@/app/components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language';
import { AuthProvider } from '@/hooks/use-auth';
import { ReceiptSettingsProvider } from '@/hooks/use-receipt-settings';
import { InvoiceSettingsProvider } from '@/hooks/use-invoice-settings';
import { FinanceSettingsProvider } from '@/hooks/use-finance-settings';
import { InventoryProvider } from '@/hooks/use-inventory';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </ThemeProvider>
  );
}

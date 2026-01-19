
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReceiptSettingsProvider } from '@/hooks/use-receipt-settings';
import { InvoiceSettingsProvider } from '@/hooks/use-invoice-settings';
import { FinanceSettingsProvider } from '@/hooks/use-finance-settings';
import queryClient from '@/lib/query-client';
import { InventoryProvider } from '@/hooks/use-inventory';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
        <InventoryProvider>
            <ReceiptSettingsProvider>
            <InvoiceSettingsProvider>
                <FinanceSettingsProvider>
                    {children}
                </FinanceSettingsProvider>
            </InvoiceSettingsProvider>
            </ReceiptSettingsProvider>
        </InventoryProvider>
    </QueryClientProvider>
  );
}

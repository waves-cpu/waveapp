
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { InventoryProvider } from '@/hooks/use-inventory';
import { ReceiptSettingsProvider } from '@/hooks/use-receipt-settings';
import { InvoiceSettingsProvider } from '@/hooks/use-invoice-settings';
import { FinanceSettingsProvider } from '@/hooks/use-finance-settings';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

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

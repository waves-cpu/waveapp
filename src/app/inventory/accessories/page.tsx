
'use client';

import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  History
} from 'lucide-react';
import { InventoryTable } from '@/app/components/inventory-table';
import { UpdateStockDialogAccessories } from '@/app/components/update-stock-dialog-accessories';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { AppLayout } from '@/app/components/app-layout';

function AccessoriesPageContent() {
  const { language } = useLanguage();
  const t = translations[language];

  const [isUpdateStockOpen, setUpdateStockOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleUpdateStock = (itemId: string) => {
    setSelectedItemId(itemId);
    setUpdateStockOpen(true);
  };

  return (
    <AppLayout>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                    {t.dashboard.accessories}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                 <Button asChild size="sm" variant="outline">
                    <Link href="/inventory/accessories/history">
                        <History className="mr-2 h-4 w-4" />
                        {t.stockHistory.title}
                    </Link>
                </Button>
                <Button asChild size="sm">
                    <Link href="/inventory/add-accessory">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t.dashboard.addAccessory}
                    </Link>
                </Button>
            </div>
        </div>
        <div className="flex-grow">
            <InventoryTable
                onUpdateStock={handleUpdateStock}
                isAccessoryTable={true}
            />
        </div>
      </main>

      <UpdateStockDialogAccessories
        open={isUpdateStockOpen}
        onOpenChange={setUpdateStockOpen}
        itemId={selectedItemId}
      />
    </AppLayout>
  );
}


export default function AccessoriesPage() {
    return (
        <AccessoriesPageContent />
    )
}

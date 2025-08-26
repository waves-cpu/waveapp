
'use client';

import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
} from 'lucide-react';
import { InventoryTable } from '@/app/components/inventory-table';
import { UpdateStockDialog } from '@/app/components/update-stock-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { AppLayout } from '@/app/components/app-layout';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem } from '@/types';

function AccessoriesPageContent() {
  const { language } = useLanguage();
  const t = translations[language];

  const [isUpdateStockOpen, setUpdateStockOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { items, loading } = useInventory();

  const accessoriesItems = useMemo(() => {
    return items.filter(item => item.category === 'Accessories');
  }, [items]);

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
                <Button asChild size="sm">
                    <Link href="/add-product">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t.dashboard.addItem}
                    </Link>
                </Button>
            </div>
        </div>
        <div className="flex-grow">
            <InventoryTable
                onUpdateStock={handleUpdateStock}
                // We pass the filtered items to the table
                // This assumes we add a prop to InventoryTable to accept items
                // For now, let's assume InventoryTable is modified or we create a new one
                // To keep it simple, I will modify InventoryTable to accept an optional `items` prop
                // But InventoryTable uses useInventory hook internally, so I need to refactor it.
                // A better approach is to not reuse InventoryTable if it's not designed for it.
                // Let's create a new component or just render the table here.
                // The InventoryTable component already has filtering logic,
                // it would be better to pass a filter prop to it.
                // Let's check InventoryTable.
                // It filters internally. I can add a new prop `category` to filter by.
            />
        </div>
      </main>

      <UpdateStockDialog
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


'use client';

import React, { useState } from 'react';
import {
  PlusCircle,
} from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { UpdateStockDialog } from './update-stock-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';

function DashboardContent() {
  const { language } = useLanguage();
  const t = translations[language];

  const [isUpdateStockOpen, setUpdateStockOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleUpdateStock = (itemId: string) => {
    setSelectedItemId(itemId);
    setUpdateStockOpen(true);
  };

  return (
    <>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                {t.dashboard.inventory}
            </h1>
        </div>
        <div className="flex-grow">
            <InventoryTable
            onUpdateStock={handleUpdateStock}
            />
        </div>
      </main>

      <UpdateStockDialog
        open={isUpdateStockOpen}
        onOpenChange={setUpdateStockOpen}
        itemId={selectedItemId}
      />
    </>
  );
}


export default function Dashboard() {
    return (
        <DashboardContent />
    )
}


'use client';

import React, { useState } from 'react';
import {
  PlusCircle,
  FileUp,
  ChevronDown,
  FilePenLine,
} from 'lucide-react';
import { InventoryTable } from './inventory-table';
import { UpdateStockDialog } from './update-stock-dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { BulkAddSheet } from './bulk-add-sheet';
import { BulkEditSheet } from './bulk-edit-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function DashboardContent() {
  const { language } = useLanguage();
  const t = translations[language];

  const [isUpdateStockOpen, setUpdateStockOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isBulkAddOpen, setBulkAddOpen] = useState(false);
  const [isBulkEditOpen, setBulkEditOpen] = useState(false);

  const handleUpdateStock = (itemId: string) => {
    setSelectedItemId(itemId);
    setUpdateStockOpen(true);
  };

  return (
    <>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                    {t.dashboard.inventory}
                </h1>
            </div>
            <div className="flex items-center gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            Aksi Massal
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setBulkAddOpen(true)}>
                             <FileUp className="mr-2 h-4 w-4" />
                             Impor Produk
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setBulkEditOpen(true)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit Produk Massal
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

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
            />
        </div>
      </main>

      <UpdateStockDialog
        open={isUpdateStockOpen}
        onOpenChange={setUpdateStockOpen}
        itemId={selectedItemId}
      />
      <BulkAddSheet
        open={isBulkAddOpen}
        onOpenChange={setBulkAddOpen}
      />
      <BulkEditSheet
        open={isBulkEditOpen}
        onOpenChange={setBulkEditOpen}
      />
    </>
  );
}


export default function Dashboard() {
    return (
        <DashboardContent />
    )
}

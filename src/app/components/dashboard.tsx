'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  PlusCircle,
  Settings,
} from 'lucide-react';
import { InventoryProvider } from '@/hooks/use-inventory';
import { InventoryTable } from './inventory-table';
import { AddItemDialog } from './add-item-dialog';
import { UpdateStockDialog } from './update-stock-dialog';
import { StockHistorySheet } from './stock-history-sheet';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { LanguageProvider } from '@/hooks/use-language';
import { ThemeProvider } from './theme-provider';

function DashboardContent() {
  const { language } = useLanguage();
  const t = translations[language];

  const [isAddItemOpen, setAddItemOpen] = useState(false);
  const [isUpdateStockOpen, setUpdateStockOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleUpdateStock = (itemId: string) => {
    setSelectedItemId(itemId);
    setUpdateStockOpen(true);
  };

  const handleShowHistory = (itemId: string) => {
    setSelectedItemId(itemId);
    setHistoryOpen(true);
  };

  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <Logo />
          </SidebarHeader>
          <SidebarContent>
             {/* The category filter has been moved to the inventory table component */}
          </SidebarContent>
          <SidebarFooter>
            <Separator className="my-2" />
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/settings" className="w-full">
                        <SidebarMenuButton>
                            <Settings />
                            {t.sidebar.settings}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                 <SidebarTrigger className="md:hidden" />
                 <h1 className="text-2xl md:text-3xl font-bold font-headline text-foreground">
                    {t.dashboard.inventory}
                </h1>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button onClick={() => setAddItemOpen(true)} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t.dashboard.addItem}
                </Button>
              </div>
            </div>
            <div className="flex-grow overflow-hidden">
                <InventoryTable
                onUpdateStock={handleUpdateStock}
                onShowHistory={handleShowHistory}
                />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <AddItemDialog open={isAddItemOpen} onOpenChange={setAddItemOpen} />
      <UpdateStockDialog
        open={isUpdateStockOpen}
        onOpenChange={setUpdateStockOpen}
        itemId={selectedItemId}
      />
      <StockHistorySheet
        open={isHistoryOpen}
        onOpenChange={setHistoryOpen}
        itemId={selectedItemId}
      />
    </>
  );
}


export default function Dashboard() {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LanguageProvider>
            <InventoryProvider>
                <DashboardContent />
            </InventoryProvider>
        </LanguageProvider>
      </ThemeProvider>
    )
}

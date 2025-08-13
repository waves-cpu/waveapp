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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  PlusCircle,
  Settings,
  Store,
  ChevronDown
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
             <SidebarMenu>
                <SidebarMenuItem>
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                                <Store />
                                {t.dashboard.inventoryMenu}
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton onClick={() => console.log("My Products")}>
                                        {t.dashboard.myProducts}
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton onClick={() => console.log("Bulk")}>
                                        {t.dashboard.bulk}
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton onClick={() => console.log("Stock In")}>
                                        {t.dashboard.stockIn}
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </Collapsible>
                </SidebarMenuItem>
            </SidebarMenu>
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
          <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                 <SidebarTrigger className="md:hidden" />
                 <h1 className="text-sm md:text-base font-bold font-headline text-foreground">
                    {t.dashboard.inventory}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setAddItemOpen(true)} variant="outline" size="sm">
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
          </main>
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


'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from '@/components/ui/sidebar';
import {
  Settings,
  Store,
  Home,
  PlusCircle,
  Package,
  ArrowRightLeft,
  ChevronDown,
  History,
  ShoppingCart,
  ShoppingBag,
  SquareTerminal,
  Users,
  BookCopy,
  BookText,
  FileText,
  Archive,
  FileBarChart,
  Settings2,
  DollarSign,
  Scale,
  ArchiveIcon,
  Sheet,
  Tags,
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const t = translations[language];
    const pathname = usePathname();
    const { items } = useInventory();
    const [isInventoryOpen, setInventoryOpen] = useState(true);
    const [isSalesOpen, setSalesOpen] = useState(true);
    const [isFinanceOpen, setFinanceOpen] = useState(true);
    
    const hasArchivedItems = useMemo(() => items.some(item => item.isArchived), [items]);

  return (
    <div className="flex h-full">
      <SidebarProvider>
          <Sidebar>
          <SidebarHeader>
              <Logo />
          </SidebarHeader>
          <SidebarContent>
              <SidebarMenu>
                  <Collapsible open={isSalesOpen} onOpenChange={setSalesOpen}>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                              <ShoppingCart />
                              <span>{t.sales.title}</span>
                              <ChevronDown className={cn("ml-auto transition-transform", isSalesOpen && "rotate-180")} />
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4">
                               <SidebarMenuItem>
                                  <Link href="/sales/shopee">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/shopee')}>
                                          <ShoppingBag />
                                          {t.sales.shopee}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/sales/tiktok">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/tiktok')}>
                                          <ShoppingBag />
                                          {t.sales.tiktok}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/sales/lazada">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/lazada')}>
                                          <ShoppingBag />
                                          {t.sales.lazada}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                                <SidebarMenuItem>
                                   <Link href="/sales/pos">
                                       <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/pos')}>
                                           <Store />
                                           {t.sales.pos}
                                       </SidebarMenuButton>
                                   </Link>
                                </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/sales/reseller">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/reseller')}>
                                          <Users />
                                          {t.sales.reseller}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                          </SidebarMenu>
                      </CollapsibleContent>
                  </Collapsible>
                  
                  <Collapsible open={isInventoryOpen} onOpenChange={setInventoryOpen}>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                              <Store />
                              <span>{t.dashboard.inventoryMenu}</span>
                              <ChevronDown className={cn("ml-auto transition-transform", isInventoryOpen && "rotate-180")} />
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4">
                               <SidebarMenuItem>
                                  <Link href="/">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/'}>
                                          <Home />
                                          {t.dashboard.myProducts}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/inventory/accessories">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/inventory/accessories')}>
                                          <Tags />
                                          {t.dashboard.accessories}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/add-product">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/add-product'}>
                                          <PlusCircle />
                                          {t.dashboard.addItem}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/stock-in">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/stock-in'}>
                                          <ArrowRightLeft />
                                          {t.dashboard.stockIn}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/inventory/archived">
                                        <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/inventory/archived'}>
                                            <Archive />
                                            {t.archived.title}
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/history">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/history'}>
                                          <History />
                                          {t.stockHistory.title}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                          </SidebarMenu>
                      </CollapsibleContent>
                  </Collapsible>

                   <Collapsible open={isFinanceOpen} onOpenChange={setFinanceOpen}>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                              <BookCopy />
                              <span>{t.finance.title}</span>
                              <ChevronDown className={cn("ml-auto transition-transform", isFinanceOpen && "rotate-180")} />
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4">
                               <SidebarMenuItem>
                                  <Link href="/finance/journal">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/journal'}>
                                          <BookText />
                                          {t.finance.generalJournal}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/finance/general-ledger">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/general-ledger'}>
                                          <FileText />
                                          {t.finance.generalLedger}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/finance/balance-sheet">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/balance-sheet'}>
                                          <Scale />
                                          {t.finance.balanceSheet}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/finance/assets">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/assets'}>
                                          <ArchiveIcon />
                                          {t.finance.assetReport}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/finance/profit-loss">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/profit-loss'}>
                                          <FileBarChart />
                                          {t.finance.profitLossReport}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/finance/settings">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/finance/settings'}>
                                          <DollarSign />
                                          {t.finance.priceSettings}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                          </SidebarMenu>
                      </CollapsibleContent>
                  </Collapsible>
                  
              </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
              <Separator className="my-2" />
              <SidebarMenu>
                  <SidebarMenuItem>
                      <Link href="/settings">
                          <SidebarMenuButton isActive={pathname === '/settings'}>
                              <Settings />
                              {t.sidebar.settings}
                          </SidebarMenuButton>
                      </Link>
                  </SidebarMenuItem>
              </SidebarMenu>
          </SidebarFooter>
          </Sidebar>
          <SidebarInset>
              {children}
          </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

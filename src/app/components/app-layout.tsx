'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Users,
  Archive,
  FileBarChart,
  Settings2,
  DollarSign,
  Truck,
  Receipt,
  Undo2,
  PackagePlus,
  LogOut,
  PackageMinus,
  LayoutGrid,
  Activity,
  Warehouse,
  FilePlus2,
  FileClock,
  Tags,
  BadgePercent,
  Ticket,
  UserSquare,
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const t = translations[language];
    const pathname = usePathname();
    const router = useRouter();
    const { items } = useInventory();
    const { user, logout } = useAuth();
    
    const hasArchivedItems = useMemo(() => items.some(item => item.isArchived), [items]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    }

    const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <div className="flex h-full">
      <SidebarProvider>
          <Sidebar>
          <SidebarHeader className="pb-4">
              <Logo />
          </SidebarHeader>
          <SidebarContent>
              <SidebarMenu>
                 <Collapsible defaultOpen={true}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                                <ShoppingCart />
                                <span className="flex-grow font-semibold">{t.sales.title}</span>
                                <ChevronDown className="transition-transform" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                        <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                              <SidebarMenuItem>
                                 <Link href="/sales/shopee">
                                     <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/sales/shopee')}>
                                         Shopee
                                     </SidebarMenuButton>
                                 </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                 <Link href="/sales/tiktok">
                                     <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/sales/tiktok')}>
                                         Tiktok
                                     </SidebarMenuButton>
                                 </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                 <Link href="/sales/lazada">
                                     <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/sales/lazada')}>
                                         Lazada
                                     </SidebarMenuButton>
                                 </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                 <Link href="/sales/reseller">
                                     <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/sales/reseller')}>
                                         <Users />
                                         Reseller
                                     </SidebarMenuButton>
                                 </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                 <Link href="/sales/pos">
                                     <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/sales/pos')}>
                                         <LayoutGrid />
                                         {t.sales.pos}
                                     </SidebarMenuButton>
                                 </Link>
                              </SidebarMenuItem>
                        </SidebarMenu>
                    </CollapsibleContent>
                </Collapsible>
                  
                <Collapsible defaultOpen={true}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                              <SidebarMenuButton>
                                  <Truck />
                                  <span className="flex-grow font-semibold">{t.shipping.title}</span>
                                  <ChevronDown className="transition-transform" />
                              </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                       <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                           <SidebarMenuItem>
                              <Link href="/shipping/manage">
                                  <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/shipping/manage')}>
                                      <Settings2 />
                                      Kelola Resi
                                  </SidebarMenuButton>
                              </Link>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                              <Link href="/shipping/return">
                                  <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/shipping/return')}>
                                      <Undo2 />
                                      {t.shipping.return}
                                  </SidebarMenuButton>
                              </Link>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                              <Link href="/shipping/report">
                                  <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/shipping/report')}>
                                      <FileBarChart />
                                      {t.shipping.report}
                                  </SidebarMenuButton>
                              </Link>
                          </SidebarMenuItem>
                      </SidebarMenu>
                    </CollapsibleContent>
                </Collapsible>
                
                <Collapsible defaultOpen={true}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                                <Warehouse />
                                <span className="flex-grow font-semibold">{t.dashboard.inventoryMenu}</span>
                                <ChevronDown className="transition-transform" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                     <CollapsibleContent>
                        <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                             <SidebarMenuItem>
                                <Link href="/">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/'}>
                                        <Package />
                                        {t.dashboard.myProducts}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <Link href="/inventory/accessories">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/inventory/accessories')}>
                                        <Package />
                                        {t.dashboard.accessories}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                              <SidebarMenuItem>
                                <Link href="/add-product">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/add-product')}>
                                        <PackagePlus/>
                                        {t.dashboard.addItem}
                                    </SidebarMenuButton>
                                </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/stock-in">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/stock-in')}>
                                          <PackagePlus />
                                          {t.dashboard.stockIn}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/history">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/history')}>
                                          <History />
                                          {t.stockHistory.title}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                               <SidebarMenuItem>
                                  <Link href="/inventory/asset-report">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/inventory/asset-report')}>
                                          <Activity />
                                          Laporan Aset
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                  <Link href="/inventory/archived">
                                      <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/inventory/archived')}>
                                          <Archive />
                                          {t.archived.title}
                                      </SidebarMenuButton>
                                  </Link>
                              </SidebarMenuItem>
                        </SidebarMenu>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible defaultOpen={true}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                                <BadgePercent />
                                <span className="flex-grow font-semibold">Promosi</span>
                                <ChevronDown className="transition-transform" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                     <CollapsibleContent>
                         <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                                <SidebarMenuItem>
                                    <Link href="/promotions/vouchers">
                                        <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/promotions/vouchers')}>
                                            <Ticket />
                                            Voucher
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <Link href="/promotions/discount-groups">
                                        <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/promotions/discount-groups')}>
                                            <Tags />
                                            Grup Diskon
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                        </SidebarMenu>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible defaultOpen={true}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                                <DollarSign />
                                <span className="flex-grow font-semibold">{t.finance.title}</span>
                                <ChevronDown className="transition-transform" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                     <CollapsibleContent>
                         <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                              <SidebarMenuItem>
                                <Link href="/finance/statements">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/finance/statements')}>
                                        <FileBarChart />
                                        {t.finance.statements}
                                    </SidebarMenuButton>
                                </Link>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                <Link href="/finance/settings">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={isActive('/finance/settings')}>
                                        <Settings2 />
                                        Pengaturan
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
                  <SidebarMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <SidebarMenuButton variant="ghost" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
                          <LogOut />
                          <span>Logout</span>
                        </SidebarMenuButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleLogout}
                          >
                            Logout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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


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

  return (
    <div className="flex h-full">
      <SidebarProvider>
          <Sidebar>
          <SidebarHeader>
              <Logo />
          </SidebarHeader>
          <SidebarContent>
              <SidebarMenu>
                  <SidebarMenuItem>
                      <SidebarMenuButton>
                          <ShoppingCart />
                          <span className="flex-grow font-semibold">{t.sales.title}</span>
                          <ChevronDown className="transition-transform" />
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                        <SidebarMenuItem>
                           <Link href="/sales/shopee">
                               <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/shopee')}>
                                   Shopee
                               </SidebarMenuButton>
                           </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <Link href="/sales/tiktok">
                               <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/tiktok')}>
                                   Tiktok
                               </SidebarMenuButton>
                           </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <Link href="/sales/lazada">
                               <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/lazada')}>
                                   Lazada
                               </SidebarMenuButton>
                           </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <Link href="/sales/pos">
                               <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/sales/pos')}>
                                   <LayoutGrid />
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
                  
                  <SidebarMenuItem>
                      <SidebarMenuButton>
                          <Warehouse />
                          <span className="flex-grow font-semibold">{t.dashboard.inventoryMenu}</span>
                          <ChevronDown className="transition-transform" />
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenu>
                       <SidebarMenuItem>
                          <Link href="/">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/'} className="pl-8">
                                  <Package />
                                  {t.dashboard.myProducts}
                              </SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                       <SidebarMenuItem>
                          <Link href="/inventory/accessories">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/inventory/accessories')} className="pl-8">
                                  <Package />
                                  {t.dashboard.accessories}
                              </SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                           <SidebarMenuButton variant="ghost" size="sm" className="pl-8 pointer-events-none">
                                <PackagePlus />
                                <span className="flex-grow font-semibold">Manajemen Produk</span>
                           </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenu>
                          <SidebarMenuItem>
                            <Link href="/add-product">
                                <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/add-product'} className="pl-16">
                                    {t.dashboard.addItem}
                                </SidebarMenuButton>
                            </Link>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <Link href="/bulk-add-products">
                                <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/bulk-add-products'} className="pl-16">
                                    {t.dashboard.bulk}
                                </SidebarMenuButton>
                            </Link>
                          </SidebarMenuItem>
                      </SidebarMenu>
                       <SidebarMenuItem>
                           <SidebarMenuButton variant="ghost" size="sm" className="pl-8 pointer-events-none">
                                <Activity />
                                <span className="flex-grow font-semibold">Aktivitas Stok</span>
                           </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Link href="/stock-in">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/stock-in'} className="pl-16">
                                        {t.dashboard.stockIn}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/stock-out">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/stock-out'} className="pl-16">
                                        {t.dashboard.stockOut}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <Link href="/history">
                                    <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/history'} className="pl-16">
                                        <History />
                                        {t.stockHistory.title}
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        </SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/inventory/archived">
                                <SidebarMenuButton variant="ghost" size="sm" isActive={pathname === '/inventory/archived'} className="pl-8">
                                    <Archive />
                                    {t.archived.title}
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                  </SidebarMenu>

                   <SidebarMenuItem>
                        <SidebarMenuButton>
                            <DollarSign />
                            <span className="flex-grow font-semibold">{t.finance.title}</span>
                            <ChevronDown className="transition-transform" />
                        </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                        <SidebarMenuItem>
                          <Link href="/finance/statements">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/finance/statements')}>
                                  <FileBarChart />
                                  {t.finance.statements}
                              </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                       <SidebarMenuItem>
                          <Link href="/finance/settings">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/finance/settings')}>
                                  <Settings2 />
                                  {t.finance.priceSettings}
                              </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                  </SidebarMenu>
                  
                   <SidebarMenuItem>
                        <SidebarMenuButton>
                            <Truck />
                            <span className="flex-grow font-semibold">{t.shipping.title}</span>
                            <ChevronDown className="transition-transform" />
                        </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenu className="ml-4 mt-2 border-l border-muted-foreground/20 pl-4 mb-4">
                       <SidebarMenuItem>
                          <Link href="/shipping/receipt">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/shipping/receipt')}>
                                  <Receipt />
                                  {t.shipping.receipt}
                              </SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/shipping/return">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/shipping/return')}>
                                  <Undo2 />
                                  {t.shipping.return}
                              </SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                          <Link href="/shipping/report">
                              <SidebarMenuButton variant="ghost" size="sm" isActive={pathname.startsWith('/shipping/report')}>
                                  <FileBarChart />
                                  {t.shipping.report}
                              </SidebarMenuButton>
                          </Link>
                      </SidebarMenuItem>
                  </SidebarMenu>

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

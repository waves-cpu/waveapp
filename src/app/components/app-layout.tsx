'use client';

import React from 'react';
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
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const t = translations[language];
    const pathname = usePathname();

  return (
    <SidebarProvider>
        <Sidebar>
        <SidebarHeader>
            <Logo />
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <Link href="/">
                        <SidebarMenuButton isActive={pathname === '/'}>
                            <Home />
                            {t.dashboard.myProducts}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <Link href="/add-product">
                        <SidebarMenuButton isActive={pathname === '/add-product'}>
                            <PlusCircle />
                            {t.dashboard.addItem}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/bulk">
                        <SidebarMenuButton isActive={pathname === '/bulk'}>
                            <Package />
                            {t.dashboard.bulk}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/stock-in">
                        <SidebarMenuButton isActive={pathname === '/stock-in'}>
                            <ArrowRightLeft />
                            {t.dashboard.stockIn}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
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
  );
}

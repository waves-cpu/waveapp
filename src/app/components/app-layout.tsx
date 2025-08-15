
'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const t = translations[language];
    const pathname = usePathname();
    const [isInventoryOpen, setInventoryOpen] = useState(true);

  return (
    <SidebarProvider>
        <Sidebar>
        <SidebarHeader>
            <Logo />
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
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

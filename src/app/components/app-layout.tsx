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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Settings,
  Store,
  ChevronDown,
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
                    <Collapsible defaultOpen={true}>
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
                                    <Link href="/">
                                        <SidebarMenuSubButton isActive={pathname === '/'}>
                                            {t.dashboard.myProducts}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                     <Link href="/add-product">
                                        <SidebarMenuSubButton isActive={pathname === '/add-product'}>
                                            {t.dashboard.addItem}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <Link href="/bulk">
                                        <SidebarMenuSubButton isActive={pathname === '/bulk'}>
                                            {t.dashboard.bulk}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <Link href="/stock-in">
                                        <SidebarMenuSubButton isActive={pathname === '/stock-in'}>
                                            {t.dashboard.stockIn}
                                        </SidebarMenuSubButton>
                                    </Link>
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

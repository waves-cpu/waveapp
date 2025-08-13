'use client';

import React from 'react';
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
} from '@/components/ui/sidebar';
import {
  Settings,
  Store,
  ChevronDown
} from 'lucide-react';
import { Logo } from './logo';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { language } = useLanguage();
    const t = translations[language];

  return (
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
                                    <Link href="/">
                                        <SidebarMenuSubButton>
                                            {t.dashboard.myProducts}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <Link href="/bulk">
                                        <SidebarMenuSubButton>
                                            {t.dashboard.bulk}
                                        </SidebarMenuSubButton>
                                    </Link>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                    <Link href="/stock-in">
                                        <SidebarMenuSubButton>
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
            {children}
        </SidebarInset>
    </SidebarProvider>
  );
}


'use client';

import { useState, useEffect } from "react";
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronDown, PlusCircle, Settings, Store } from "lucide-react"
import { useTheme } from "next-themes"
import { useLanguage, Language } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Logo } from "../components/logo";
import { Separator } from "@/components/ui/separator";
import { LanguageProvider } from "@/hooks/use-language";
import { ThemeProvider } from "../components/theme-provider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


function SettingsContent() {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const t = translations[language];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    <div className="mx-auto grid w-full max-w-6xl gap-2">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="flex-1 shrink-0 whitespace-nowrap text-sm font-semibold tracking-tight sm:grow-0">
                                {t.settings.title}
                            </h1>
                        </div>
                    </div>
                    <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t.settings.appearance}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t.settings.appearanceDescription}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="theme" className="text-xs">{t.settings.theme}</Label>
                                        {mounted ? (
                                            <Select value={theme} onValueChange={(value) => setTheme(value)}>
                                                <SelectTrigger id="theme" className="w-[280px] text-xs">
                                                    <SelectValue placeholder={t.settings.selectThemePlaceholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="light" className="text-xs">{t.settings.light}</SelectItem>
                                                    <SelectItem value="dark" className="text-xs">{t.settings.dark}</SelectItem>
                                                    <SelectItem value="system" className="text-xs">{t.settings.system}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Skeleton className="w-[280px] h-9" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t.settings.language}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t.settings.languageDescription}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="language" className="text-xs">{t.settings.language}</Label>
                                        {mounted ? (
                                            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                                                <SelectTrigger id="language" className="w-[280px] text-xs">
                                                    <SelectValue placeholder={t.settings.selectLanguagePlaceholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en" className="text-xs">English</SelectItem>
                                                    <SelectItem value="id" className="text-xs">Bahasa Indonesia</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Skeleton className="w-[280px] h-9" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}


export default function SettingsPage() {
  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LanguageProvider>
            <SettingsContent />
        </LanguageProvider>
    </ThemeProvider>
  )
}

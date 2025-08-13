
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
import { ChevronLeft, Settings } from "lucide-react"
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
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Logo } from "../components/logo";
import { Separator } from "@/components/ui/separator";
import { LanguageProvider } from "@/hooks/use-language";
import { ThemeProvider } from "../components/theme-provider";


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
                    {/* Add any additional sidebar content here if needed */}
                </SidebarContent>
                <SidebarFooter>
                    <Separator className="my-2" />
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/" className="w-full">
                                <SidebarMenuButton>
                                    <ChevronLeft />
                                    {t.settings.back}
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
                            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                                {t.settings.title}
                            </h1>
                        </div>
                    </div>
                    <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.settings.appearance}</CardTitle>
                                    <CardDescription>
                                        {t.settings.appearanceDescription}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="theme">{t.settings.theme}</Label>
                                        {mounted ? (
                                            <Select value={theme} onValueChange={(value) => setTheme(value)}>
                                                <SelectTrigger id="theme" className="w-[280px]">
                                                    <SelectValue placeholder={t.settings.selectThemePlaceholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="light">{t.settings.light}</SelectItem>
                                                    <SelectItem value="dark">{t.settings.dark}</SelectItem>
                                                    <SelectItem value="system">{t.settings.system}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Skeleton className="w-[280px] h-10" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t.settings.language}</CardTitle>
                                    <CardDescription>
                                        {t.settings.languageDescription}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Label htmlFor="language">{t.settings.language}</Label>
                                        {mounted ? (
                                            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                                                <SelectTrigger id="language" className="w-[280px]">
                                                    <SelectValue placeholder={t.settings.selectLanguagePlaceholder} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="en">English</SelectItem>
                                                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Skeleton className="w-[280px] h-10" />
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

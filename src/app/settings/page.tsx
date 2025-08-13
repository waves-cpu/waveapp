
'use client';

import { useState, useEffect } from "react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "next-themes"
import { useLanguage, Language } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { Skeleton } from "@/components/ui/skeleton";


function SettingsContent() {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const t = translations[language];
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
            <div className="mx-auto grid w-full max-w-6xl gap-2">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-lg font-semibold tracking-tight sm:grow-0">
                        {t.settings.title}
                    </h1>
                </div>
            </div>
            <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t.settings.appearance}</CardTitle>
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
                                    <Skeleton className="w-[280px] h-9" />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t.settings.language}</CardTitle>
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
                                    <Skeleton className="w-[280px] h-9" />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}


export default function SettingsPage() {
  return (
    <SettingsContent />
  )
}

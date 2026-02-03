
'use client';

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { AppLayout } from "../components/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Palette, Languages, KeyRound } from 'lucide-react';
import { UserManagementCard } from "../components/user-management-card";
import { useToast } from "@/hooks/use-toast";

function ChangePasswordCard() {
    const { user, updateUserPassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Password Terlalu Pendek', description: 'Password minimal harus 6 karakter.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Password Tidak Cocok', description: 'Pastikan kedua kolom password sama persis.' });
            return;
        }
        if (!user) return;

        setIsSubmitting(true);
        try {
            await updateUserPassword(user.id, newPassword);
            toast({ title: 'Password Berhasil Diubah' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Mengubah Password', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><KeyRound /> Pengaturan Akun</CardTitle>
                <CardDescription>
                    Ubah kata sandi Anda.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={user?.username || ''} disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="newPassword">Kata Sandi Baru</Label>
                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isSubmitting}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isSubmitting}/>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                        {isSubmitting ? 'Menyimpan...' : 'Ubah Kata Sandi'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

function SettingsContent() {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const { user } = useAuth();
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
                    <ChangePasswordCard />
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><Palette /> {t.settings.appearance}</CardTitle>
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
                            <CardTitle className="flex items-center gap-2 text-base"><Languages /> {t.settings.language}</CardTitle>
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

                    {user?.role === 'admin' && (
                        <UserManagementCard />
                    )}
                </div>
            </div>
        </main>
    )
}


export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsContent />
    </AppLayout>
  )
}

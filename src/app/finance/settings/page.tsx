
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { FinanceSettingsForm } from "@/app/components/finance-settings-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";


export default function FinanceSettingsPage() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Pengaturan Keuangan</h1>
                </div>

                <div className="max-w-4xl mx-auto">
                    <FinanceSettingsForm />
                </div>
            </main>
        </AppLayout>
    )
}

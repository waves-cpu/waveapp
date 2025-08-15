'use client';

import { BulkAddForm } from "@/app/components/bulk-add-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";

export default function BulkPage() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
            <div className="w-full max-w-7xl">
                 <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.dashboard.bulk}</h1>
                </div>
                <BulkAddForm />
            </div>
        </main>
    );
}

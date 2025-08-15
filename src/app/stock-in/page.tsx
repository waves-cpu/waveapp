
'use client';

import { StockInForm } from "@/app/components/stock-in-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";

export default function StockInPage() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.dashboard.stockIn}</h1>
                </div>
                <StockInForm />
            </div>
        </main>
    );
}

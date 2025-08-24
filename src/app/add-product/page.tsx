
'use client';

import { AddProductForm } from "@/app/components/add-product-form";
import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";

export default function AddProductPage() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.dashboard.addItem}</h1>
                    </div>
                    <AddProductForm />
                </div>
            </main>
        </AppLayout>
    );
}

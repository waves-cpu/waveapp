
'use client';

import React, { useState } from 'react';
import { StockInForm } from "@/app/components/stock-in-form";
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { PackagePlus, PlusCircle } from 'lucide-react';
import { AppLayout } from '../components/app-layout';

export default function StockInPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [isBulkStockInOpen, setBulkStockInOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10 pb-8">
                <div className="w-full max-w-7xl">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-bold">{t.dashboard.stockIn}</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setBulkStockInOpen(true)} disabled={bulkSelectedIds.size === 0}>
                                <PackagePlus className="mr-2 h-4 w-4" />
                                {t.stockInForm.bulkAdd}
                            </Button>
                            <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t.stockInForm.selectProducts}
                            </Button>
                        </div>
                    </div>
                    <StockInForm 
                        isProductSelectionOpen={isProductSelectionOpen}
                        setProductSelectionOpen={setProductSelectionOpen}
                        isBulkStockInOpen={isBulkStockInOpen}
                        setBulkStockInOpen={setBulkStockInOpen}
                        bulkSelectedIds={bulkSelectedIds}
                        setBulkSelectedIds={setBulkSelectedIds}
                    />
                </div>
            </main>
        </AppLayout>
    );
}

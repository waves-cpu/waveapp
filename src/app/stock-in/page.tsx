
'use client';

import React, { useState, useRef } from 'react';
import { StockInForm } from "@/app/components/stock-in-form";
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { PackagePlus, PlusCircle } from 'lucide-react';
import { AppLayout } from '../components/app-layout';
import { useRouter } from 'next/navigation';

export default function StockInPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [isBulkStockInOpen, setBulkStockInOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    // A ref to hold the form's submit function, which will be populated by the child form component
    const formSubmitRef = useRef<() => void>();

    const handleFormSubmit = async () => {
        setIsSubmitting(true);
        if (formSubmitRef.current) {
           await formSubmitRef.current();
        }
        setIsSubmitting(false);
    };

    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10 pb-24">
                <div className="w-full max-w-7xl">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-bold">{t.dashboard.stockIn}</h1>
                        </div>
                         <div className="flex items-center gap-2">
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
                        isSubmitting={isSubmitting}
                        handleSubmit={() => formSubmitRef.current?.()}
                    />
                </div>
                 <div className="fixed bottom-0 left-0 md:left-[var(--sidebar-width)] group-data-[collapsible=icon]:md:left-[var(--sidebar-width-icon)] w-full transition-[left] duration-200 ease-linear">
                    <div className="bg-background/95 backdrop-blur-sm border-t p-4">
                         <div className="max-w-7xl mx-auto flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => router.push('/')} disabled={isSubmitting}>{t.common.cancel}</Button>
                            <Button onClick={handleFormSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : t.stockInForm.submit}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}

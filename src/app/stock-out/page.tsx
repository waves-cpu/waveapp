'use client';

import React, { useState } from 'react';
import { StockInForm, type StockInSubmitData } from "@/app/components/stock-in-form";
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { PackageMinus, PackagePlus, PlusCircle } from 'lucide-react';
import { AppLayout } from '../components/app-layout';
import { BulkStockInDialog } from '@/app/components/bulk-stock-in-dialog';
import { ConfirmTransactionDialog } from '@/app/components/confirm-transaction-dialog';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function StockOutPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TStockOut = t.stockOutForm;
    const { updateStock } = useInventory();
    const { toast } = useToast();
    const router = useRouter();

    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [isBulkStockInOpen, setBulkStockInOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

    const [stockOutData, setStockOutData] = useState<StockInSubmitData | null>(null);
    const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const handleFormSubmit = (data: StockInSubmitData) => {
        setStockOutData(data);
        setConfirmDialogOpen(true);
    };

    const handleConfirmStockOut = async (reason: string) => {
        if (!stockOutData) return;

        const stockUpdates = stockOutData.stockInItems
            .filter(item => item.quantity > 0)
            .map(item => updateStock(item.itemId, -item.quantity, reason));
        
        try {
            await Promise.all(stockUpdates);
            toast({
                title: TStockOut.successTitle,
                description: TStockOut.successDescription.replace('{count}', stockUpdates.length.toString()),
            });
            setConfirmDialogOpen(false);
            setStockOutData(null);
            router.push('/');
        } catch (error) {
             console.error("Failed to stock out:", error);
            toast({
                title: "Error",
                description: "Failed to update stock. Please try again.",
                variant: "destructive"
            });
        }
    };


    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10 pb-8">
                <div className="w-full max-w-7xl">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-bold">{TStockOut.title}</h1>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setBulkStockInOpen(true)} disabled={bulkSelectedIds.size === 0}>
                                <PackagePlus className="mr-2 h-4 w-4" />
                                {TStockOut.bulkAdd}
                            </Button>
                            <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {TStockOut.selectProducts}
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
                        onFinalSubmit={handleFormSubmit}
                    />
                </div>
            </main>
             <ConfirmTransactionDialog
                open={isConfirmDialogOpen}
                onOpenChange={setConfirmDialogOpen}
                onConfirm={handleConfirmStockOut}
                itemCount={stockOutData?.stockInItems.filter(i => i.quantity > 0).length || 0}
                title={TStockOut.title}
                description={TStockOut.confirmDialogDescription.replace('{count}', (stockOutData?.stockInItems.filter(i => i.quantity > 0).length || 0).toString())}
                submitText={TStockOut.submit}
                reasonLabel={t.stockInForm.reason}
                defaultReason={TStockOut.defaultReason}
            />
        </AppLayout>
    );
}



'use client';

import React, { useState } from 'react';
import { TransactionForm, type TransactionSubmitData } from "@/app/components/stock-in-form";
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { PackageMinus, PlusCircle } from 'lucide-react';
import { AppLayout } from '../components/app-layout';
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
    const [isBulkQuantityOpen, setBulkQuantityOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

    const [transactionData, setTransactionData] = useState<TransactionSubmitData | null>(null);
    const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const handleFormSubmit = (data: TransactionSubmitData) => {
        setTransactionData(data);
        setConfirmDialogOpen(true);
    };

    const handleConfirmStockOut = async (reason: string) => {
        if (!transactionData) return;

        const stockUpdates = transactionData.transactionItems
            .filter(item => item.quantity > 0)
            .map(item => updateStock(item.itemId, -item.quantity, reason));
        
        try {
            await Promise.all(stockUpdates);
            toast({
                title: TStockOut.successTitle,
                description: TStockOut.successDescription.replace('{count}', stockUpdates.length.toString()),
            });
            setConfirmDialogOpen(false);
            setTransactionData(null);
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
                            <Button type="button" variant="outline" onClick={() => setBulkQuantityOpen(true)} disabled={bulkSelectedIds.size === 0}>
                                <PackageMinus className="mr-2 h-4 w-4" />
                                {TStockOut.bulkAdd}
                            </Button>
                            <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {TStockOut.selectProducts}
                            </Button>
                        </div>
                    </div>
                    <TransactionForm 
                        transactionType="out"
                        isProductSelectionOpen={isProductSelectionOpen}
                        setProductSelectionOpen={setProductSelectionOpen}
                        isBulkQuantityOpen={isBulkQuantityOpen}
                        setBulkQuantityOpen={setBulkQuantityOpen}
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
                itemCount={transactionData?.transactionItems.filter(i => i.quantity > 0).length || 0}
                title={TStockOut.title}
                description={TStockOut.confirmDialogDescription.replace('{count}', (transactionData?.transactionItems.filter(i => i.quantity > 0).length || 0).toString())}
                submitText={TStockOut.submit}
                reasonLabel={t.stockInForm.reason}
                defaultReason={TStockOut.defaultReason}
            />
        </AppLayout>
    );
}

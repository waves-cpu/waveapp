
'use client';

import { useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { TransactionForm, type TransactionSubmitData } from '@/app/components/stock-in-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackagePlus, FileUp, ListChecks } from 'lucide-react';
import { ConfirmTransactionDialog } from '../components/confirm-stock-in-dialog';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function StockInPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TStockIn = t.stockInForm;
    const { toast } = useToast();
    const router = useRouter();

    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [isBulkQuantityOpen, setBulkQuantityOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
    
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [transactionData, setTransactionData] = useState<TransactionSubmitData | null>(null);

    const handleFormSubmit = (data: TransactionSubmitData) => {
        setTransactionData(data);
        setConfirmOpen(true);
    };

    const handleFinalConfirm = async (reason: string) => {
        if (!transactionData) return;

        try {
            const response = await fetch('/api/products/stock-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: transactionData.transactionItems, reason })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update stock');
            }
            
            toast({
                title: TStockIn.successTitle,
                description: TStockIn.successDescription.replace('{count}', transactionData.transactionItems.length.toString()),
            });
            router.push('/history');

        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: error instanceof Error ? error.message : "An unknown error occurred",
            });
        } finally {
            setConfirmOpen(false);
            setTransactionData(null);
        }
    };
    
    const itemCount = transactionData?.transactionItems?.length || 0;

    return (
        <AppLayout>
            <main className="flex min-h-screen flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                            {TStockIn.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setBulkQuantityOpen(true)} disabled={bulkSelectedIds.size === 0}>
                            <ListChecks className="mr-2 h-4 w-4" />
                            {TStockIn.bulkAdd} ({bulkSelectedIds.size})
                        </Button>
                        <Button size="sm" onClick={() => setProductSelectionOpen(true)}>
                            <PackagePlus className="mr-2 h-4 w-4" />
                            {TStockIn.selectProducts}
                        </Button>
                    </div>
                </div>
                 <TransactionForm
                    transactionType="in"
                    isProductSelectionOpen={isProductSelectionOpen}
                    setProductSelectionOpen={setProductSelectionOpen}
                    isBulkQuantityOpen={isBulkQuantityOpen}
                    setBulkQuantityOpen={setBulkQuantityOpen}
                    bulkSelectedIds={bulkSelectedIds}
                    setBulkSelectedIds={setBulkSelectedIds}
                    onFinalSubmit={handleFormSubmit}
                />
            </main>
            <ConfirmTransactionDialog
                open={isConfirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={handleFinalConfirm}
                itemCount={itemCount}
                title={TStockIn.title}
                description={TStockIn.confirmDialogDescription.replace('{count}', itemCount.toString())}
                submitText={TStockIn.submit}
                reasonLabel={TStockIn.reason}
                defaultReason={TStockIn.defaultReason}
            />
        </AppLayout>
    );
}

    
'use client';

import { useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { TransactionForm, type TransactionSubmitData } from '@/app/components/stock-in-form';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle } from 'lucide-react';
import { ConfirmTransactionDialog } from '../components/confirm-stock-in-dialog';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function StockOutPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TStockOut = t.stockOutForm;
    const { toast } = useToast();
    const router = useRouter();

    const [isBulkQuantityOpen, setBulkQuantityOpen] = useState(false);
    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
    
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [transactionData, setTransactionData] = useState<TransactionSubmitData | null>(null);

    const handleFormSubmit = (data: TransactionSubmitData) => {
        if (data.transactionItems.length === 0) {
            toast({
                variant: 'destructive',
                title: "Daftar Kosong",
                description: "Silakan tambahkan setidaknya satu produk untuk dicatat.",
            });
            return;
        }
        const itemsToProcess = data.transactionItems.filter(item => item.quantity > 0);
        if(itemsToProcess.length === 0) {
            toast({
                variant: 'destructive',
                title: "Tidak ada kuantitas",
                description: "Silakan masukkan jumlah untuk setidaknya satu produk.",
            });
            return;
        }
        
        setTransactionData({ ...data, transactionItems: itemsToProcess });
        setConfirmOpen(true);
    };

    const handleFinalConfirm = async (reason: string) => {
        if (!transactionData) return;

        try {
            const response = await fetch('/api/products/stock-out', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'secret-api-key-for-waveapp',
                },
                body: JSON.stringify({ items: transactionData.transactionItems, reason })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update stock');
            }
            
            toast({
                title: TStockOut.successTitle,
                description: TStockOut.successDescription.replace('{count}', transactionData.transactionItems.length.toString()),
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
                            {TStockOut.title}
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setProductSelectionOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {TStockOut.selectProducts}
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setBulkQuantityOpen(true)} 
                            disabled={bulkSelectedIds.size === 0}
                        >
                            <ListChecks className="mr-2 h-4 w-4" />
                            {t.stockInForm.bulkAdd} ({bulkSelectedIds.size})
                        </Button>
                    </div>
                </div>
                 <TransactionForm
                    transactionType="out"
                    isBulkQuantityOpen={isBulkQuantityOpen}
                    setBulkQuantityOpen={setBulkQuantityOpen}
                    isProductSelectionOpen={isProductSelectionOpen}
                    setProductSelectionOpen={setProductSelectionOpen}
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
                title={TStockOut.title}
                description={TStockOut.confirmDialogDescription.replace('{count}', itemCount.toString())}
                submitText={TStockOut.submit}
                reasonLabel={TStockOut.reason}
                defaultReason={TStockOut.defaultReason}
            />
        </AppLayout>
    );
}

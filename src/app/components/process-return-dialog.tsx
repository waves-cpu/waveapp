
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ReturnedItem } from '@/types';

export const ProcessReturnDialog = ({
    open,
    onOpenChange,
    onProcessReturn,
    receipt,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProcessReturn: (transactionId: string, items: ReturnedItem[]) => Promise<void>;
    receipt: ShippingReceipt | null;
}) => {
    const { allSales } = useInventory();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([]);
    
    useEffect(() => {
        if (!open) {
            setReturnedItems([]);
            setIsSubmitting(false);
        } else if (receipt?.transactionId) {
            const originalSaleItems = allSales.filter(s => s.transactionId === receipt.transactionId);
            const itemsToReturn: ReturnedItem[] = [];
            
            originalSaleItems.forEach(saleItem => {
                const sku = saleItem.sku;
                if(sku) {
                    const name = saleItem.variantName ? `${saleItem.productName} - ${saleItem.variantName}` : saleItem.productName;
                    const existing = itemsToReturn.find(i => i.sku === sku);
                    if(existing) {
                        existing.quantity += saleItem.quantity;
                    } else {
                        itemsToReturn.push({ sku, name, quantity: saleItem.quantity, price: saleItem.priceAtSale });
                    }
                }
            });
            setReturnedItems(itemsToReturn);
        }
    }, [open, receipt, allSales]);

    const { totalItems, totalValue } = useMemo(() => {
        return returnedItems.reduce((acc, item) => {
            acc.totalItems += item.quantity;
            acc.totalValue += item.quantity * item.price;
            return acc;
        }, { totalItems: 0, totalValue: 0 });
    }, [returnedItems]);


    const handleFinalizeReturn = async () => {
        if (returnedItems.length === 0 || !receipt || !receipt.transactionId) return;
        setIsSubmitting(true);
        try {
            await onProcessReturn(receipt.transactionId, returnedItems);
            onOpenChange(false);
        } catch(e) {
            // Error is handled in parent, do nothing here to keep dialog open
        }
        finally {
            setIsSubmitting(false);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Proses Barang Return</DialogTitle>
                    <DialogDescription>
                       Konfirmasi barang yang kembali ke gudang untuk resi: <span className="font-semibold">{receipt?.awb}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                     <Card>
                        <CardContent className="p-0">
                            <ScrollArea className="h-72 border rounded-md">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead>Produk</TableHead>
                                            <TableHead className="w-[120px] text-center">Jumlah</TableHead>
                                            <TableHead className="w-[150px] text-right">Harga Satuan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnedItems.length > 0 ? returnedItems.map(item => (
                                            <TableRow key={item.sku}>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                                    Tidak ada produk yang tercatat pada transaksi ini.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                     <TableFooter>
                                        <TableRow>
                                            <TableHead>Total</TableHead>
                                            <TableHead className="text-center font-bold">{totalItems}</TableHead>
                                            <TableHead className="text-right font-bold">{formatCurrency(totalValue)}</TableHead>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                     </Card>
                </div>
                
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleFinalizeReturn} disabled={returnedItems.length === 0 || isSubmitting}>
                        {isSubmitting ? 'Memproses...' : 'Proses & Kembalikan Stok'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

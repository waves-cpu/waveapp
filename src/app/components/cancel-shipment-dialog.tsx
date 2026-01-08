
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
import type { ShippingReceipt, Sale } from '@/types';

export const CancelShipmentDialog = ({
    open,
    onOpenChange,
    onProcessCancellation,
    receipt,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProcessCancellation: (transactionId: string) => Promise<void>;
    receipt: ShippingReceipt | null;
}) => {
    const { allSales } = useInventory();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const saleItems = useMemo(() => {
        if (!receipt?.transactionId) return [];
        return allSales.filter(s => s.transactionId === receipt.transactionId);
    }, [receipt, allSales]);

    useEffect(() => {
        if (!open) {
            setIsSubmitting(false);
        }
    }, [open]);

    const { totalItems, totalValue } = useMemo(() => {
        return saleItems.reduce((acc, item) => {
            acc.totalItems += item.quantity;
            acc.totalValue += item.quantity * item.priceAtSale;
            return acc;
        }, { totalItems: 0, totalValue: 0 });
    }, [saleItems]);


    const handleFinalizeCancellation = async () => {
        if (saleItems.length === 0 || !receipt || !receipt.transactionId) return;
        setIsSubmitting(true);
        try {
            await onProcessCancellation(receipt.transactionId);
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
                    <DialogTitle>Batalkan Pengiriman</DialogTitle>
                    <DialogDescription>
                       Konfirmasi pembatalan untuk resi: <span className="font-semibold">{receipt?.awb}</span>. Stok akan dikembalikan.
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
                                            <TableHead className="w-[150px] text-right">Harga</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {saleItems.length > 0 ? saleItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{item.productName}</p>
                                                    {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                                                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.priceAtSale)}</TableCell>
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Tutup</Button>
                    <Button onClick={handleFinalizeCancellation} disabled={saleItems.length === 0 || isSubmitting} variant="destructive">
                        {isSubmitting ? 'Memproses...' : 'Ya, Batalkan & Kembalikan Stok'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

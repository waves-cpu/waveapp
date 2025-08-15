
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
  TableFooter
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Sale } from '@/types';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


interface DailySalesDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: Sale[];
}

interface AggregatedSale {
    productName: string;
    variantName?: string;
    sku?: string;
    channel: string;
    quantity: number;
}

export function DailySalesDetailDialog({ open, onOpenChange, sales }: DailySalesDetailDialogProps) {
    
    const { aggregatedSales, totalQuantity } = useMemo(() => {
        const aggregationMap = new Map<string, AggregatedSale>();

        sales.forEach(sale => {
            const key = sale.sku || sale.productId; // Use SKU as the primary key for aggregation
            const existingEntry = aggregationMap.get(key);

            if (existingEntry) {
                existingEntry.quantity += sale.quantity;
            } else {
                aggregationMap.set(key, {
                    productName: sale.productName,
                    variantName: sale.variantName,
                    sku: sale.sku,
                    channel: sale.channel,
                    quantity: sale.quantity,
                });
            }
        });

        const aggregatedSales = Array.from(aggregationMap.values());
        const totalQuantity = aggregatedSales.reduce((sum, sale) => sum + sale.quantity, 0);

        return { aggregatedSales, totalQuantity };
    }, [sales]);

    const salesDate = useMemo(() => {
        if (sales.length > 0) {
            return format(new Date(sales[0].saleDate), 'PP');
        }
        return '';
    }, [sales]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Penjualan Harian</DialogTitle>
          <DialogDescription>
            Menampilkan semua item yang terjual pada tanggal {salesDate}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Saluran</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {aggregatedSales.map(sale => (
                        <TableRow key={sale.sku || sale.productName}>
                            <TableCell>
                                <div className="font-medium">{sale.productName}</div>
                                {sale.variantName && <div className="text-xs text-muted-foreground">{sale.variantName}</div>}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="capitalize">{sale.channel}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{sale.quantity}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Total Terjual</TableCell>
                        <TableCell className="text-right font-bold">{totalQuantity}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

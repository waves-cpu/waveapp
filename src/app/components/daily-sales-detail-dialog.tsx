
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
  title?: string;
  description?: string;
}

interface AggregatedSale {
    productName: string;
    variantName?: string;
    sku?: string;
    channel: string;
    quantity: number;
}

export function DailySalesDetailDialog({ open, onOpenChange, sales, title, description }: DailySalesDetailDialogProps) {
    
    const { aggregatedSales, totalQuantity } = useMemo(() => {
        if (!sales) return { aggregatedSales: [], totalQuantity: 0 };
        const aggregationMap = new Map<string, AggregatedSale>();

        sales.forEach(sale => {
            // Use a composite key to correctly aggregate items that might share an SKU but are different products/variants
            const key = `${sale.productId}-${sale.variantId || 'none'}`;
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
        if (sales && sales.length > 0) {
            return format(new Date(sales[0].saleDate), 'PP');
        }
        return '';
    }, [sales]);

    const defaultTitle = "Detail Penjualan Harian";
    const defaultDescription = `Menampilkan semua item yang terjual pada tanggal ${salesDate}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || defaultTitle}</DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96 border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50%]">Produk</TableHead>
                        <TableHead className="text-center">Jumlah</TableHead>
                        <TableHead>Saluran</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {aggregatedSales.map((sale, index) => (
                        <TableRow key={`${sale.sku}-${index}` || `${sale.productName}-${index}`}>
                            <TableCell>
                                <div className="font-medium">{sale.productName}</div>
                                {sale.variantName && <div className="text-xs text-muted-foreground">{sale.variantName}</div>}
                                {sale.sku && <div className="text-xs text-muted-foreground">SKU: {sale.sku}</div>}
                            </TableCell>
                            <TableCell className="text-center">{sale.quantity}</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="capitalize">{sale.channel}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell className="text-right font-bold">Total Terjual</TableCell>
                        <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

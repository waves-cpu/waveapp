
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
import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';


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
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
        }
    }, [open]);
    
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

        const allAggregatedSales = Array.from(aggregationMap.values());
        
        const filteredSales = searchTerm
            ? allAggregatedSales.filter(sale => {
                const lowerSearchTerm = searchTerm.toLowerCase();
                return (
                    sale.productName.toLowerCase().includes(lowerSearchTerm) ||
                    (sale.variantName && sale.variantName.toLowerCase().includes(lowerSearchTerm)) ||
                    (sale.sku && sale.sku.toLowerCase().includes(lowerSearchTerm))
                );
              })
            : allAggregatedSales;

        const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);

        return { aggregatedSales: filteredSales, totalQuantity };
    }, [sales, searchTerm]);

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title || defaultTitle}</DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari produk atau SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>

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
                    {aggregatedSales.length > 0 ? (
                        aggregatedSales.map((sale, index) => (
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
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                Tidak ada produk yang cocok dengan pencarian Anda.
                            </TableCell>
                        </TableRow>
                    )}
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

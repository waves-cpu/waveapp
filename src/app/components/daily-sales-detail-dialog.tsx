
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
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { id as localeId } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    productCategory: string;
    quantity: number;
    priceAtSale: number;
    size?: string;
    totalRevenue: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export function DailySalesDetailDialog({ open, onOpenChange, sales, title, description }: DailySalesDetailDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            setCategoryFilter(null);
        }
    }, [open]);

    const uniqueCategories = useMemo(() => {
        if (!sales) return [];
        const categories = new Set(sales.map(sale => sale.productCategory).filter(Boolean));
        return Array.from(categories).sort();
    }, [sales]);
    
    const { aggregatedSales, totalQuantity, totalRevenue } = useMemo(() => {
        if (!sales) return { aggregatedSales: [], totalQuantity: 0, totalRevenue: 0 };
        const aggregationMap = new Map<string, AggregatedSale>();

        sales.forEach(sale => {
            const saleDate = format(parseISO(sale.saleDate), 'yyyy-MM-dd');
            const key = `${sale.sku}-${saleDate}-${sale.channel}`;

            const existingEntry = aggregationMap.get(key);

            if (existingEntry) {
                existingEntry.quantity += sale.quantity;
                existingEntry.totalRevenue += sale.quantity * sale.priceAtSale;
            } else {
                aggregationMap.set(key, {
                    productName: sale.productName,
                    variantName: sale.variantName,
                    sku: sale.sku,
                    channel: sale.channel,
                    productCategory: sale.productCategory,
                    quantity: sale.quantity,
                    priceAtSale: sale.priceAtSale,
                    size: sale.variantName,
                    totalRevenue: sale.quantity * sale.priceAtSale,
                });
            }
        });

        const allAggregatedSales = Array.from(aggregationMap.values());
        
        const filteredSales = allAggregatedSales.filter(sale => {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const searchMatch = searchTerm
                ? (
                    sale.productName.toLowerCase().includes(lowerSearchTerm) ||
                    (sale.variantName && sale.variantName.toLowerCase().includes(lowerSearchTerm)) ||
                    (sale.sku && sale.sku.toLowerCase().includes(lowerSearchTerm))
                  )
                : true;
            
            const categoryMatch = categoryFilter ? sale.productCategory === categoryFilter : true;
            
            return searchMatch && categoryMatch;
        });

        const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalRevenue, 0);

        return { aggregatedSales: filteredSales, totalQuantity, totalRevenue };
    }, [sales, searchTerm, categoryFilter]);

    const salesDate = useMemo(() => {
        if (sales && sales.length > 0) {
            return format(parseISO(sales[0].saleDate), 'PPP', { locale: localeId });
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

        <div className="flex flex-col sm:flex-row gap-2 my-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari produk atau SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
             <Select value={categoryFilter || 'all'} onValueChange={value => setCategoryFilter(value === 'all' ? null : value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Kategori" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {uniqueCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="border rounded-md">
          <ScrollArea className="h-96">
              <Table className="table-fixed">
                  <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                          <TableHead className="w-[35%]">Produk</TableHead>
                          <TableHead className="w-[20%]">Kategori</TableHead>
                          <TableHead className="w-[10%]">Ukuran</TableHead>
                          <TableHead className="text-center w-[10%]">Jumlah</TableHead>
                          <TableHead className="text-right w-[15%]">Harga Satuan</TableHead>
                          <TableHead className="text-right w-[15%]">Total</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {aggregatedSales.length > 0 ? (
                          aggregatedSales.map((sale, index) => (
                              <TableRow key={`${sale.sku}-${index}` || `${sale.productName}-${index}`}>
                                  <TableCell>
                                      <div className="font-medium truncate whitespace-nowrap">{sale.productName}</div>
                                      {sale.sku && <div className="text-xs text-muted-foreground">SKU: {sale.sku}</div>}
                                  </TableCell>
                                  <TableCell>{sale.productCategory}</TableCell>
                                  <TableCell>
                                      {sale.size || '-'}
                                  </TableCell>
                                  <TableCell className="text-center">{sale.quantity}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(sale.priceAtSale)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(sale.totalRevenue)}</TableCell>
                              </TableRow>
                          ))
                      ) : (
                           <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                  Tidak ada produk yang cocok dengan pencarian Anda.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
                   <TableFooter>
                      <TableRow>
                          <TableCell colSpan={3} className="text-left font-bold">Total</TableCell>
                          <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
                          <TableCell colSpan={2} className="text-right font-bold">{formatCurrency(totalRevenue)}</TableCell>
                      </TableRow>
                  </TableFooter>
              </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

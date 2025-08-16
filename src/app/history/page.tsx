
'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Calendar as CalendarIcon, Eye, ShoppingCart, ShoppingBag, FileDown } from 'lucide-react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { AppLayout } from '../components/app-layout';
import { Pagination } from '@/components/ui/pagination';

type HistoryEntry = {
    type: 'adjustment' | 'sales_summary';
    date: Date;
    change: number;
    reason: string;
    // For adjustments
    itemName?: string;
    variantName?: string;
    variantSku?: string;
    newStockLevel?: number;
    imageUrl?: string;
    itemCategory?: string;
    // For sales summaries
    sales?: Sale[];
};


export default function HistoryPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { items, categories, allSales, loading } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [isSalesDetailOpen, setSalesDetailOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const allHistory = useMemo((): HistoryEntry[] => {
    const historyList: HistoryEntry[] = [];

    // Process adjustments
    items.forEach(item => {
      const processHistory = (history: AdjustmentHistory[], parentItem: InventoryItem, variant?: InventoryItemVariant) => {
        history.forEach(entry => {
            // Filter out sales adjustments and entries with no change
            if (entry.change !== 0 && !entry.reason.toLowerCase().startsWith('sale') && !entry.reason.toLowerCase().startsWith('cancelled sale')) {
                 historyList.push({
                    type: 'adjustment',
                    date: new Date(entry.date),
                    change: entry.change,
                    reason: entry.reason,
                    newStockLevel: entry.newStockLevel,
                    itemName: parentItem.name,
                    itemCategory: parentItem.category,
                    variantName: variant?.name,
                    variantSku: variant?.sku,
                    imageUrl: parentItem.imageUrl,
                });
            }
        });
      }
      
      if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
          if(variant.history) processHistory(variant.history, item, variant);
        });
      } else if(item.history) {
        processHistory(item.history, item);
      }
    });

    // Process and group sales
    const salesByDay = new Map<string, Sale[]>();
    allSales.forEach(sale => {
        const dayKey = startOfDay(new Date(sale.saleDate)).toISOString();
        if (!salesByDay.has(dayKey)) {
            salesByDay.set(dayKey, []);
        }
        salesByDay.get(dayKey)!.push(sale);
    });

    salesByDay.forEach((dailySales, dateString) => {
        const totalChange = dailySales.reduce((sum, sale) => sum - sale.quantity, 0);
        historyList.push({
            type: 'sales_summary',
            date: new Date(dateString),
            reason: 'Penjualan',
            change: totalChange,
            sales: dailySales,
            itemCategory: 'Penjualan', // Assign a category for filtering
            newStockLevel: undefined, // Explicitly undefined for sales summary
        });
    });


    return historyList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items, allSales]);

  const filteredHistory = useMemo(() => {
    const filtered = allHistory
      .filter(entry => {
        if (!categoryFilter) return true;
        if (categoryFilter === 'Penjualan') return entry.type === 'sales_summary';
        return entry.itemCategory === categoryFilter;
      })
      .filter(entry => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if(!lowerSearchTerm) return true;
        return (
            (entry.itemName && entry.itemName.toLowerCase().includes(lowerSearchTerm)) ||
            (entry.variantName && entry.variantName.toLowerCase().includes(lowerSearchTerm)) ||
            entry.reason.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .filter(entry => {
          if (!dateRange || (!dateRange.from && !dateRange.to)) return true;
          const entryDate = new Date(entry.date);
          entryDate.setHours(0,0,0,0);
          if (dateRange.from && entryDate < dateRange.from) return false;
          if (dateRange.to) {
             const toDate = new Date(dateRange.to);
             toDate.setHours(23,59,59,999);
             if(entryDate > toDate) return false;
          }
          return true;
      })
      .filter(entry => {
        if (adjustmentTypeFilter === 'all') return true;
        if (adjustmentTypeFilter === 'in') return entry.change > 0;
        if (adjustmentTypeFilter === 'out') return entry.change < 0;
        return true;
      });

      setCurrentPage(1);
      return filtered;
  }, [allHistory, categoryFilter, searchTerm, dateRange, adjustmentTypeFilter]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  const historyTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredHistory.forEach(entry => {
        if (entry.change > 0) {
            totalIn += entry.change;
        } else {
            totalOut += Math.abs(entry.change);
        }
    });
    const netChange = totalIn - totalOut;
    return { totalIn, totalOut, netChange };
  }, [filteredHistory])
  
  const viewSalesDetail = (sales: Sale[]) => {
      setSelectedSales(sales);
      setSalesDetailOpen(true);
  }

  const uniqueCategoriesWithSales = useMemo(() => {
      return [...categories, 'Penjualan'].sort()
  },[categories])

  const handleApplyDateRange = () => {
    setDateRange(tempDateRange);
    setDatePickerOpen(false);
  };
  
  const handleCancelDateRange = () => {
    setTempDateRange(dateRange);
    setDatePickerOpen(false);
  };

  const downloadCSV = () => {
    const headers = ['Tanggal', 'Nama Produk', 'Varian', 'SKU', 'Kategori', 'Alasan', 'Perubahan', 'Stok Akhir'];
    const rows = filteredHistory.map(entry => {
        const rowData = [
            format(entry.date, 'yyyy-MM-dd HH:mm:ss'),
            entry.itemName || (entry.type === 'sales_summary' ? 'Ringkasan Penjualan' : ''),
            entry.variantName || '',
            entry.variantSku || '',
            entry.itemCategory || '',
            `"${entry.reason.replace(/"/g, '""')}"`, // Escape double quotes
            entry.change,
            entry.newStockLevel ?? 'N/A'
        ];
        return rowData.join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'riwayat_stok.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <main className="flex min-h-screen flex-1 flex-col gap-4 bg-muted/40 p-4 pb-8 md:gap-8 md:p-10">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
            {t.stockHistory.title}
          </h1>
        </div>
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 flex flex-col gap-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex flex-col md:flex-row gap-4 w-full flex-1">
                    <div className="relative w-full md:w-auto md:flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder={t.stockHistory.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                        />
                    </div>
                    <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                        <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
                        {uniqueCategoriesWithSales.map((category) => (
                            <SelectItem key={category} value={category}>
                            {category}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full md:w-[300px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>{t.stockHistory.dateRange}</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={tempDateRange?.from}
                            selected={tempDateRange}
                            onSelect={setTempDateRange}
                            numberOfMonths={2}
                        />
                        <div className="p-2 border-t flex justify-end gap-2">
                          <Button variant="ghost" onClick={handleCancelDateRange}>{t.common.cancel}</Button>
                          <Button onClick={handleApplyDateRange}>{t.common.apply}</Button>
                        </div>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={downloadCSV} variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" />
                        {t.inventoryTable.exportCsv.replace('Excel', 'CSV')}
                    </Button>
                </div>
            </div>
             <div className="px-1 py-2 flex items-center gap-2 border-b border-dashed">
                <Button variant={adjustmentTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('all')}>
                    Semua
                </Button>
                <Button variant={adjustmentTypeFilter === 'in' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('in')}>
                    Stok Masuk
                </Button>
                <Button variant={adjustmentTypeFilter === 'out' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('out')}>
                    Stok Keluar
                </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[35%]">{t.inventoryTable.name}</TableHead>
                <TableHead>{t.stockHistory.date}</TableHead>
                <TableHead>{t.stockHistory.reason}</TableHead>
                <TableHead>{t.stockHistory.change}</TableHead>
                <TableHead>{t.stockHistory.newTotal}</TableHead>
                <TableHead className="w-[50px] text-center">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">Memuat riwayat...</TableCell>
                    </TableRow>
                ) : paginatedHistory.length > 0 ? (
                paginatedHistory.map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            {entry.type === 'adjustment' ? (
                                <div className="flex items-center gap-4">
                                      {entry.imageUrl ? (
                                        <Image 
                                            src={entry.imageUrl} 
                                            alt={entry.itemName!} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                      ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted">
                                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                      )}
                                    <div>
                                        <div className="font-medium text-sm">{entry.itemName}</div>
                                        {entry.variantName && (
                                            <div className="text-xs text-muted-foreground">
                                                {entry.variantName}
                                                {entry.variantSku && ` (SKU: ${entry.variantSku})`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 font-semibold text-primary">
                                    <ShoppingCart className="h-5 w-5" />
                                    <span>{entry.reason}</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell>
                            <Badge variant={entry.change >= 0 ? 'default' : 'destructive'} className={cn(entry.change >= 0 ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                            </Badge>
                        </TableCell>
                        <TableCell>{entry.newStockLevel ?? '-'}</TableCell>
                        <TableCell className="text-center">
                            {entry.type === 'sales_summary' && entry.sales && (
                                <Button variant="ghost" size="icon" onClick={() => viewSalesDetail(entry.sales!)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    {t.inventoryTable.noItems}
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-semibold text-right">Total Perubahan:</TableCell>
                    <TableCell colSpan={3} className="font-semibold">
                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                            <span className="text-green-600">Masuk: {historyTotals.totalIn}</span>
                            <span className="text-red-600">Keluar: {historyTotals.totalOut}</span>
                            <span>Net: 
                                <span className={cn(historyTotals.netChange >= 0 ? "text-green-600" : "text-red-600", "ml-1")}>
                                    {historyTotals.netChange > 0 && '+'}{historyTotals.netChange}
                                </span>
                            </span>
                        </div>
                    </TableCell>
                </TableRow>
            </TableFooter>
            </Table>
            <div className="flex items-center justify-end p-4 border-t">
                <div className="flex items-center gap-4">
                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                    <Select
                        value={`${itemsPerPage}`}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value))
                            setCurrentPage(1)
                        }}
                        >
                        <SelectTrigger className="h-8 w-[200px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 50, 100].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {`${pageSize} / ${t.productSelectionDialog.page}`}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </main>
      <DailySalesDetailDialog 
          open={isSalesDetailOpen}
          onOpenChange={setSalesDetailOpen}
          sales={selectedSales}
      />
    </AppLayout>
  );
}



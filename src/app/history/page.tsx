
'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { Search, Calendar as CalendarIcon, Eye, ShoppingCart, ShoppingBag, FileDown, History } from 'lucide-react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { format, startOfDay, isSameDay, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { AppLayout } from '../components/app-layout';
import { Pagination } from '@/components/ui/pagination';

type AdjustmentEntry = {
    type: 'adjustment';
    date: Date;
    change: number;
    reason: string;
    itemName?: string;
    variantName?: string;
    variantSku?: string;
    newStockLevel?: number;
    imageUrl?: string;
    itemCategory?: string;
};

type AggregatedSalesEntry = {
    type: 'sales';
    date: Date;
    channel: string;
    totalItems: number;
    sales: Sale[];
};

type HistoryEntry = AdjustmentEntry | AggregatedSalesEntry;

export default function HistoryPage() {
  const { items, categories, allSales, loading } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [isSalesDetailOpen, setSalesDetailOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const allHistory = useMemo((): HistoryEntry[] => {
    const historyList: HistoryEntry[] = [];
    const allSaleChannels = ['shopee', 'tiktok', 'lazada', 'pos', 'reseller'];

    // Process adjustments first, filtering out sales-related adjustments
    items.forEach(item => {
      const processHistory = (history: AdjustmentHistory[], parentItem: InventoryItem, variant?: InventoryItemVariant) => {
        history.forEach(entry => {
            const reasonLower = entry.reason.toLowerCase();
            const isSaleAdjustment = allSaleChannels.some(ch => reasonLower.startsWith(`sale (${ch})`) || reasonLower.startsWith(`cancelled sale (${ch})`) || reasonLower.startsWith(`cancelled transaction`));
            const isInitialStock = reasonLower === 'initial stock';
            
            if (!isSaleAdjustment && !isInitialStock && (entry.change !== 0 || reasonLower !== 'no change')) {
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

    // Group and aggregate all sales
    const groupedSales = new Map<string, { date: Date; channel: string; totalItems: number; sales: Sale[] }>();
    
    allSales.forEach(sale => {
        const saleDate = parseISO(sale.saleDate);
        const key = `${format(saleDate, 'yyyy-MM-dd')}-${sale.channel}`;
        
        if (!groupedSales.has(key)) {
            groupedSales.set(key, {
                date: saleDate,
                channel: sale.channel,
                totalItems: 0,
                sales: [],
            });
        }
        const group = groupedSales.get(key)!;
        group.totalItems += sale.quantity;
        group.sales.push(sale);
    });

    groupedSales.forEach(group => {
        historyList.push({
            type: 'sales',
            date: group.date,
            channel: group.channel,
            totalItems: group.totalItems,
            sales: group.sales,
        });
    });

    return historyList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items, allSales]);

  const years = useMemo(() => {
    const allYears = new Set(allHistory.map(h => h.date.getFullYear()));
    if (allYears.size === 0) allYears.add(new Date().getFullYear());
    return Array.from(allYears).sort((a, b) => b - a);
  }, [allHistory]);


  const baseFilteredHistory = useMemo(() => {
    return allHistory
      .filter(entry => {
        if (!categoryFilter) return true;
        if (entry.type === 'sales') return true; 
        return entry.itemCategory === categoryFilter;
      })
      .filter(entry => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if(!lowerSearchTerm) return true;
        if (entry.type === 'sales') {
            return entry.channel.toLowerCase().includes(lowerSearchTerm) || `sales ${entry.channel}`.includes(lowerSearchTerm);
        }
        return (
            (entry.itemName && entry.itemName.toLowerCase().includes(lowerSearchTerm)) ||
            (entry.variantName && entry.variantName.toLowerCase().includes(lowerSearchTerm)) ||
            entry.reason.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getFullYear() === selectedYear && entryDate.getMonth() === selectedMonth;
      });
  }, [allHistory, categoryFilter, searchTerm, selectedMonth, selectedYear]);

  const adjustmentCounts = useMemo(() => {
    const counts = { all: baseFilteredHistory.length, in: 0, out: 0 };
    baseFilteredHistory.forEach(entry => {
      if (entry.type === 'adjustment') {
        if (entry.change > 0) counts.in += entry.change;
        else if (entry.change < 0) counts.out += Math.abs(entry.change);
      } else if (entry.type === 'sales') {
        counts.out += entry.totalItems;
      }
    });
    return counts;
  }, [baseFilteredHistory]);
  
  const filteredHistory = useMemo(() => {
    const filtered = baseFilteredHistory.filter(entry => {
        if (adjustmentTypeFilter === 'all') return true;
        const change = entry.type === 'adjustment' ? entry.change : -entry.totalItems;
        if (adjustmentTypeFilter === 'in') return change > 0;
        if (adjustmentTypeFilter === 'out') return change < 0;
        return true;
      });

      setCurrentPage(1);
      return filtered;
  }, [baseFilteredHistory, adjustmentTypeFilter]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  const historyTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredHistory.forEach(entry => {
        if (entry.type === 'adjustment') {
            if (entry.change > 0) {
                totalIn += entry.change;
            } else {
                totalOut += Math.abs(entry.change);
            }
        } else if (entry.type === 'sales') {
            totalOut += entry.totalItems;
        }
    });
    const netChange = totalIn - totalOut;
    return { totalIn, totalOut, netChange };
  }, [filteredHistory])
  
  const uniqueCategoriesWithSales = useMemo(() => {
      return [...categories].sort()
  },[categories])

  const handleShowSalesDetail = (sales: Sale[]) => {
    setSelectedSales(sales);
    setSalesDetailOpen(true);
  };

  const downloadCSV = () => {
    const headers = ['Tanggal', 'Nama Produk', 'Varian', 'SKU', 'Kategori', 'Alasan', 'Perubahan', 'Stok Akhir'];
    const rows = filteredHistory.map(entry => {
        if(entry.type === 'sales') {
            return [
                format(entry.date, 'yyyy-MM-dd HH:mm:ss'),
                `Penjualan ${entry.channel}`,
                '',
                '',
                'Penjualan Online',
                `Total ${entry.totalItems} item terjual`,
                -entry.totalItems,
                'N/A'
            ].join(',');
        }

        const rowData = [
            format(entry.date, 'yyyy-MM-dd HH:mm:ss'),
            entry.itemName || '',
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
        <div className="bg-card rounded-lg border shadow-sm flex flex-col flex-grow">
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
                    <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Pilih Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                    {format(new Date(0, i), 'MMMM', { locale: localeId })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                        <SelectTrigger className="w-full md:w-[120px]">
                            <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={downloadCSV} variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" />
                        {t.inventoryTable.exportCsv.replace('Excel', 'CSV')}
                    </Button>
                </div>
            </div>
             <div className="px-1 py-2 flex items-center gap-2 border-b border-dashed">
                <Button variant={adjustmentTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('all')}>
                    Semua <Badge variant="secondary" className="ml-2">{adjustmentCounts.all}</Badge>
                </Button>
                <Button variant={adjustmentTypeFilter === 'in' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('in')}>
                    Stok Masuk <Badge variant="secondary" className="ml-2">{adjustmentCounts.in}</Badge>
                </Button>
                <Button variant={adjustmentTypeFilter === 'out' ? 'secondary' : 'ghost'} size="sm" onClick={() => setAdjustmentTypeFilter('out')}>
                    Stok Keluar <Badge variant="secondary" className="ml-2">{adjustmentCounts.out}</Badge>
                </Button>
            </div>
          </div>
          <div className='flex-grow overflow-y-auto'>
          <Table className='table-fixed'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[30%]">{t.inventoryTable.name}</TableHead>
                    <TableHead className="w-[15%]">{t.stockHistory.date}</TableHead>
                    <TableHead className="w-[10%] text-center">{t.stockHistory.change}</TableHead>
                    <TableHead className="w-[10%] text-center">{t.stockHistory.newTotal}</TableHead>
                    <TableHead className="w-[35%]">{t.stockHistory.reason}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">Memuat riwayat...</TableCell>
                    </TableRow>
                ) : paginatedHistory.length > 0 ? (
                paginatedHistory.map((entry, index) => (
                    <TableRow key={index}>
                    {entry.type === 'adjustment' ? (
                       <>
                        <TableCell>
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
                                    <div className="font-medium text-sm truncate">{entry.itemName}</div>
                                    {entry.variantName && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {entry.variantName}
                                            {entry.variantSku && ` (SKU: ${entry.variantSku})`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={entry.change >= 0 ? 'default' : 'destructive'} className={cn(entry.change >= 0 ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center">{entry.newStockLevel ?? '-'}</TableCell>
                        <TableCell>
                            <p className="truncate">{entry.reason}</p>
                        </TableCell>
                       </>
                    ) : (
                        <>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted">
                                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm capitalize">Penjualan {entry.channel}</div>
                                     <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleShowSalesDetail(entry.sales)}>
                                        Lihat Detail
                                        <Eye className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </TableCell>
                         <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                         <TableCell className="text-center">
                            <Badge variant='destructive' className="bg-red-600 text-white">
                                -{entry.totalItems}
                            </Badge>
                         </TableCell>
                         <TableCell className="text-center">-</TableCell>
                         <TableCell>
                             <p className="truncate">Total {entry.totalItems} item terjual dari channel {entry.channel}.</p>
                         </TableCell>
                        </>
                    )}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <History className="h-16 w-16" />
                            <div className="text-center">
                                <p className="font-semibold">Tidak Ada Riwayat</p>
                                <p className="text-sm">Coba ubah filter atau periode tanggal.</p>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-semibold text-left">Total Perubahan:</TableCell>
                    <TableCell colSpan={2} className="font-semibold">
                         <div className="flex items-center justify-between flex-wrap gap-y-1">
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
            </div>
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

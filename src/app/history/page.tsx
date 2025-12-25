

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Search, Calendar as CalendarIcon, Eye, ShoppingCart, ShoppingBag, FileDown, History, ExternalLink, Loader2 } from 'lucide-react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { format, startOfDay, isSameDay, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { AppLayout } from '../components/app-layout';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

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
    // Add categories to allow filtering
    productCategories: string[];
};

type HistoryEntry = AdjustmentEntry | AggregatedSalesEntry;

export default function HistoryPage() {
  const { items, categories, allSales, loading } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [isSalesDetailOpen, setSalesDetailOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    const currentDate = new Date();
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  }, []);


  const allHistoryForMonth = useMemo((): HistoryEntry[] => {
    if (selectedMonth === undefined || selectedYear === undefined) return [];
    if (loading) return [];

    const historyList: HistoryEntry[] = [];
    const dateFilter = new Date(selectedYear, selectedMonth);
    const startDate = startOfMonth(dateFilter);
    const endDate = endOfMonth(dateFilter);

    // Process Adjustments for the selected month
    items.forEach(item => {
      const processHistory = (history: AdjustmentHistory[], parentItem: InventoryItem, variant?: InventoryItemVariant) => {
        history.forEach(entry => {
            const entryDate = new Date(entry.date);
            if (!isWithinInterval(entryDate, { start: startDate, end: endDate })) {
                return;
            }

            const reasonLower = entry.reason.toLowerCase();
            const isSaleAdjustment = ['shopee', 'tiktok', 'lazada', 'pos', 'reseller'].some(ch => reasonLower.startsWith(`sale (${ch})`) || reasonLower.startsWith(`cancelled sale (${ch})`));
            
            if (!isSaleAdjustment && (entry.change !== 0 || !reasonLower.includes('penyesuaian modal'))) {
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

    // Group and aggregate sales for the selected month
    const groupedSales = new Map<string, { date: Date; channel: string; totalItems: number; sales: Sale[], categories: Set<string> }>();
    
    allSales.forEach(sale => {
        const saleDate = parseISO(sale.saleDate);
         if (!isWithinInterval(saleDate, { start: startDate, end: endDate })) {
            return;
        }

        const key = `${format(saleDate, 'yyyy-MM-dd')}-${sale.channel}`;
        
        if (!groupedSales.has(key)) {
            groupedSales.set(key, {
                date: saleDate,
                channel: sale.channel,
                totalItems: 0,
                sales: [],
                categories: new Set()
            });
        }
        const group = groupedSales.get(key)!;
        group.totalItems += sale.quantity;
        group.sales.push(sale);
        if(sale.productCategory) {
            group.categories.add(sale.productCategory);
        }
    });

    groupedSales.forEach(group => {
        historyList.push({
            type: 'sales',
            date: group.date,
            channel: group.channel,
            totalItems: group.totalItems,
            sales: group.sales,
            productCategories: Array.from(group.categories),
        });
    });

    return historyList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items, allSales, selectedMonth, selectedYear, loading]);

  const years = useMemo(() => {
    const allYears = new Set(allSales.map(s => parseISO(s.saleDate).getFullYear()));
    const currentYear = new Date().getFullYear();
    allYears.add(currentYear);
    return Array.from(allYears).sort((a, b) => b - a);
  }, [allSales]);


  const baseFilteredHistory = useMemo(() => {
    return allHistoryForMonth
      .filter(entry => {
        if (!categoryFilter) return true;
        if (entry.type === 'adjustment') return entry.itemCategory === categoryFilter;
        if (entry.type === 'sales') return entry.productCategories.includes(categoryFilter);
        return true;
      })
      .filter(entry => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if(!lowerSearchTerm) return true;
        if (entry.type === 'sales') {
            return entry.channel.toLowerCase().includes(lowerSearchTerm) || `penjualan ${entry.channel}`.toLowerCase().includes(lowerSearchTerm);
        }
        return (
            (entry.itemName && entry.itemName.toLowerCase().includes(lowerSearchTerm)) ||
            (entry.variantName && entry.variantName.toLowerCase().includes(lowerSearchTerm)) ||
            entry.reason.toLowerCase().includes(lowerSearchTerm)
        );
      });
  }, [allHistoryForMonth, categoryFilter, searchTerm]);

  const adjustmentCounts = useMemo(() => {
    const counts = { all: 0, in: 0, out: 0 };
    baseFilteredHistory.forEach(entry => {
      counts.all++;
      if (entry.type === 'adjustment') {
        if (entry.change > 0) counts.in += entry.change;
        else if (entry.change < 0) counts.out += Math.abs(entry.change);
      } else if (entry.type === 'sales') {
        counts.out += entry.totalItems;
      }
    });
    return counts;
  }, [baseFilteredHistory]);
  
  const filteredHistory = useMemo((): HistoryEntry[] => {
    if (adjustmentTypeFilter === 'all') {
      return baseFilteredHistory;
    }
    const filtered: HistoryEntry[] = baseFilteredHistory.filter(entry => {
        if (adjustmentTypeFilter === 'in') {
            return entry.type === 'adjustment' && entry.change > 0;
        } else if (adjustmentTypeFilter === 'out') {
            return (entry.type === 'adjustment' && entry.change < 0) || entry.type === 'sales';
        }
        return false;
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

    baseFilteredHistory.forEach(entry => {
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
  }, [baseFilteredHistory]);
  
  const uniqueCategoriesWithSales = useMemo(() => {
      return [...categories].sort()
  },[categories])

  const handleShowSalesDetail = (sales: Sale[]) => {
    setSelectedSales(sales);
    setSalesDetailOpen(true);
  };
  
  const getSaleDetailLink = (entry: AggregatedSalesEntry): string => {
      const onlineChannels = ['shopee', 'tiktok', 'lazada'];
      const historyChannels = ['pos', 'reseller'];
      const formattedDate = format(entry.date, 'MM-dd-yyyy');
      
      if (onlineChannels.includes(entry.channel)) {
          return `/sales/${entry.channel}/${formattedDate}`;
      }
      if (historyChannels.includes(entry.channel)) {
          return `/sales/${entry.channel}/history`;
      }
      return '#';
  }

  const downloadExcel = async () => {
    const { toast: toastRef } = toast({ title: 'Memulai unduhan', description: 'Laporan Excel sedang disiapkan...' });
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time

    const headers = ['Tanggal', 'Nama Produk', 'Varian', 'SKU', 'Kategori', 'Alasan', 'Perubahan', 'Stok Akhir'];
    
    const data: (string | number)[][] = [];

    filteredHistory.forEach(entry => {
        if(entry.type === 'sales') {
            entry.sales.forEach(sale => {
                data.push([
                    format(parseISO(sale.saleDate), 'yyyy-MM-dd HH:mm:ss'),
                    sale.productName,
                    sale.variantName || '',
                    sale.sku || sale.parentSku || '',
                    sale.productCategory || '',
                    `Penjualan ${sale.channel}`,
                    -sale.quantity,
                    'N/A' // Cannot determine final stock level accurately here
                ]);
            });
        } else { // 'adjustment'
            data.push([
                format(entry.date, 'yyyy-MM-dd HH:mm:ss'),
                entry.itemName || '',
                entry.variantName || '',
                entry.variantSku || '',
                entry.itemCategory || '',
                entry.reason,
                entry.change,
                entry.newStockLevel ?? 'N/A'
            ]);
        }
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Stok');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = 'riwayat_stok.xlsx';
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
    setIsExporting(false);
    toastRef.update({
        id: toastRef.id,
        title: "Unduhan Siap",
        description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
    });
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
        <Card className="flex-grow flex flex-col">
            <CardHeader className="p-4 flex flex-col gap-4 border-b">
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
                        {selectedMonth !== undefined && (
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
                        )}
                        {selectedYear !== undefined && (
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
                        )}
                        <Button onClick={downloadExcel} variant="outline" size="sm" disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isExporting ? "Mengekspor..." : t.inventoryTable.exportCsv.replace('CSV', 'Excel')}
                        </Button>
                    </div>
                </div>
                <div className="px-1 py-2 flex items-center gap-2 border-b border-dashed -mb-4">
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
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[250px]">{t.inventoryTable.name}</TableHead>
                        <TableHead>{t.stockHistory.date}</TableHead>
                        <TableHead className="text-center">{t.stockHistory.change}</TableHead>
                        <TableHead className="text-center">{t.stockHistory.newTotal}</TableHead>
                        <TableHead>{t.stockHistory.reason}</TableHead>
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
                                        width={36} height={36} 
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
                            <TableCell>{format(new Date(entry.date), 'd MMM yyyy, HH:mm')}</TableCell>
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
                                        <button onClick={() => handleShowSalesDetail(entry.sales)} className="flex items-center text-xs text-primary hover:underline">
                                            Lihat Detail
                                            <Eye className="ml-1 h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{format(new Date(entry.date), 'd MMM yyyy')}</TableCell>
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
                    <TableRow className='h-full'>
                        <TableCell colSpan={5} className="h-full text-center">
                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full py-24">
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
                {paginatedHistory.length > 0 && (
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="font-semibold text-left">Total Perubahan Bulan Ini:</TableCell>
                            <TableCell colSpan={2} className="font-semibold">
                                <div className="flex items-center justify-between flex-wrap gap-y-1">
                                    <span className="text-green-600">Masuk: {historyTotals.totalIn.toLocaleString('id-ID')}</span>
                                    <span className="text-red-600">Keluar: {historyTotals.totalOut.toLocaleString('id-ID')}</span>
                                    <span>Net: 
                                        <span className={cn(historyTotals.netChange >= 0 ? "text-green-600" : "text-red-600", "ml-1")}>
                                            {historyTotals.netChange > 0 && '+'}{historyTotals.netChange.toLocaleString('id-ID')}
                                        </span>
                                    </span>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
                </Table>
            </CardContent>
          {paginatedHistory.length > 0 && (
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
          )}
        </Card>
      </main>
      <DailySalesDetailDialog 
          open={isSalesDetailOpen}
          onOpenChange={setSalesDetailOpen}
          sales={selectedSales}
      />
    </AppLayout>
  );
}


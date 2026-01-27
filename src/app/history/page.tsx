
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
import { Search, Calendar as CalendarIcon, Eye, ShoppingCart, ShoppingBag, FileDown, History, ExternalLink, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn, formatToWIB } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { AppLayout } from '../components/app-layout';
import { Pagination } from '@/components/ui/pagination';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

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
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [isSalesDetailOpen, setSalesDetailOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setDate({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
  }, []);

  const allHistory = useMemo((): HistoryEntry[] => {
    if (!date?.from || loading) return [];
    
    const startDate = startOfDay(date.from);
    const endDate = endOfDay(date.to || date.from);
    
    const historyList: HistoryEntry[] = [];

    // Process Adjustments for the selected month
    items.forEach(item => {
      const processHistory = (history: AdjustmentHistory[], parentItem: InventoryItem, variant?: InventoryItemVariant) => {
        history.forEach(entry => {
            const entryDate = parseISO(entry.date as any);
            if (!isWithinInterval(entryDate, { start: startDate, end: endDate })) {
                return;
            }

            const reasonLower = entry.reason.toLowerCase();
            const isSaleAdjustment = ['shopee', 'tiktok', 'lazada', 'pos', 'reseller'].some(ch => reasonLower.startsWith(`sale (${ch})`) || reasonLower.startsWith(`cancelled sale (${ch})`));
            
            if (!isSaleAdjustment && (entry.change !== 0 || !reasonLower.includes('penyesuaian modal'))) {
                 historyList.push({
                    type: 'adjustment',
                    date: entryDate,
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

        const key = `${formatToWIB(saleDate, 'yyyy-MM-dd')}-${sale.channel}`;
        
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
  }, [items, allSales, date, loading]);
  
  const datePresets = [
    { label: "Hari Ini", range: { from: new Date(), to: new Date() } },
    { label: "Minggu Ini", range: { from: startOfWeek(new Date(), { locale: localeId }), to: endOfWeek(new Date(), { locale: localeId }) } },
    { label: "Bulan Ini", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Tahun Ini", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
  ];


  const baseFilteredHistory = useMemo(() => {
    return allHistory
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
  }, [allHistory, categoryFilter, searchTerm]);

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
      const formattedDate = formatToWIB(entry.date, 'MM-dd-yyyy');
      
      if (onlineChannels.includes(entry.channel)) {
          return `/sales/${entry.channel}/${formattedDate}`;
      }
      if (historyChannels.includes(entry.channel)) {
          return `/sales/${entry.channel}/history`;
      }
      return '#';
  }

  const downloadExcel = () => {
    setIsExporting(true);
    const { id, update } = toast({ title: 'Memulai unduhan', description: 'Laporan Excel sedang disiapkan...' });
    
    setTimeout(() => {
        const headers = ['Tanggal', 'Nama Produk', 'Varian', 'SKU', 'Kategori', 'Alasan', 'Perubahan', 'Stok Akhir'];
        
        const data: (string | number)[][] = [];

        filteredHistory.forEach(entry => {
            if(entry.type === 'sales') {
                entry.sales.forEach(sale => {
                    data.push([
                        formatToWIB(parseISO(sale.saleDate), 'yyyy-MM-dd HH:mm:ss'),
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
                    formatToWIB(entry.date, 'yyyy-MM-dd HH:mm:ss'),
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
        const dateFrom = date?.from ? formatToWIB(date.from, 'dd-MM-yy') : 'start';
        const dateTo = date?.to ? formatToWIB(date.to, 'dd-MM-yy') : 'end';
        const fileName = `Riwayat_Stok_${dateFrom}_sampai_${dateTo}.xlsx`;
        saveAs(new Blob([excelBuffer], {type:"application/octet-stream"}), fileName);
        
        update({
            id,
            title: "Unduhan Siap",
            description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
        });
        setIsExporting(false);
    }, 500);
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
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full md:w-[260px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {formatToWIB(date.from, "d LLL, y")} -{" "}
                                                {formatToWIB(date.to, "d LLL, y")}
                                            </>
                                        ) : (
                                            formatToWIB(date.from, "d LLL, y")
                                        )
                                    ) : (
                                        <span>Pilih periode</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="flex w-auto flex-row" align="end">
                                <div className="flex flex-col gap-1 pr-4 border-r">
                                    {datePresets.map(preset => (
                                        <Button key={preset.label} variant="ghost" className="justify-start" onClick={() => setDate(preset.range)}>{preset.label}</Button>
                                    ))}
                                </div>
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={1}
                                />
                            </PopoverContent>
                        </Popover>
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
               <div className="p-6">
                {loading ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">Memuat riwayat...</div>
                ) : paginatedHistory.length > 0 ? (
                     <div className="relative pl-6">
                         {paginatedHistory.map((entry, index) => {
                            const isFirst = index === 0;
                            const isLast = index === paginatedHistory.length - 1;
                            const isSale = entry.type === 'sales';
                            const isStockIn = !isSale && entry.change > 0;
                            const isStockOut = !isSale && entry.change < 0;

                            const Icon = isSale ? ShoppingCart : (isStockIn ? ArrowUpCircle : ArrowDownCircle);
                            const iconColor = isSale ? 'text-blue-500' : (isStockIn ? 'text-green-500' : 'text-red-500');

                            return (
                                <div key={index} className="relative flex items-start pb-8">
                                    {!isLast && <div className="absolute left-3 -bottom-8 h-full w-px bg-border" />}
                                    <div className="absolute left-0 top-0">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background ring-4 ring-background">
                                            <Icon className={`h-6 w-6 ${iconColor}`} />
                                        </span>
                                    </div>
                                    <div className="ml-12 w-full">
                                        {entry.type === 'adjustment' ? (
                                             <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    <Image src={entry.imageUrl || 'https://placehold.co/40x40.png'} alt={entry.itemName || ''} width={40} height={40} className="rounded-md" />
                                                    <div>
                                                        <p className="font-medium text-sm">{entry.itemName} {entry.variantName && <span className="text-muted-foreground">({entry.variantName})</span>}</p>
                                                        <p className="text-xs text-muted-foreground">{entry.reason}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <Badge variant={isStockIn ? 'default' : 'destructive'} className={cn(isStockIn ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200')}>
                                                        {entry.change > 0 ? `+${entry.change}` : entry.change}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">Stok Akhir: {entry.newStockLevel}</p>
                                                     <p className="text-xs text-muted-foreground mt-1">{formatToWIB(new Date(entry.date), 'd MMM, HH:mm')}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-sm capitalize">Penjualan {entry.channel}</p>
                                                    <p className="text-xs text-muted-foreground">{entry.totalItems} item terjual</p>
                                                </div>
                                                <div className="text-right">
                                                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => handleShowSalesDetail(entry.sales)}>Lihat Detail</Button>
                                                    <p className="text-xs text-muted-foreground mt-1">{formatToWIB(new Date(entry.date), 'd MMM yyyy')}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <History className="h-16 w-16" />
                        <div className="text-center">
                            <p className="font-semibold">Tidak Ada Riwayat</p>
                            <p className="text-sm">Coba ubah filter atau periode tanggal.</p>
                        </div>
                    </div>
                )}
               </div>
            </CardContent>
          {paginatedHistory.length > 0 && (
            <>
            <CardFooter className="bg-muted/50 p-3">
                 <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                        Menampilkan {paginatedHistory.length} dari {filteredHistory.length} entri.
                    </div>
                     <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm">
                        <span className="font-medium">Total Bulan Ini:</span>
                        <span className="text-green-600 font-medium">Masuk: {historyTotals.totalIn.toLocaleString('id-ID')}</span>
                        <span className="text-red-600 font-medium">Keluar: {historyTotals.totalOut.toLocaleString('id-ID')}</span>
                        <span className="font-bold">Net: 
                            <span className={cn(historyTotals.netChange >= 0 ? "text-green-600" : "text-red-600", "ml-1")}>
                                {historyTotals.netChange > 0 && '+'}{historyTotals.netChange.toLocaleString('id-ID')}
                            </span>
                        </span>
                    </div>
                 </div>
            </CardFooter>
            <div className="flex items-center justify-between p-4 border-t">
                 <div className="text-xs text-muted-foreground invisible">
                    Menampilkan {paginatedHistory.length} dari {filteredHistory.length} entri.
                 </div>
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
            </>
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


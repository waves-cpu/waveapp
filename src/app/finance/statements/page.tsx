
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { Sale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Package, ArrowDownRight, DollarSign, BarChart2, Star, TrendingUp, Eye, ChevronDown, FileDown, Loader2, Search, TrendingDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, startOfDay, endOfDay, subMonths, isSameDay, eachDayOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { cn, formatToWIB } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import { Skeleton } from '@/components/ui/skeleton';
import { id as localeId } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { LineChart, Line, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Cell } from "recharts"


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

interface AggregatedVariant {
    variantId: string | null;
    name: string;
    sku?: string;
    units: number;
    revenue: number;
    profit: number;
    marketplaceCut: number;
    netProfit: number;
}


interface AggregatedProduct {
    productId: string;
    name: string;
    sku?: string;
    category: string;
    imageUrl?: string;
    releaseDate?: string;
    unitsSold: number;
    revenue: number;
    profit: number;
    marketplaceCut: number;
    netProfit: number;
    variants: AggregatedVariant[];
}


function AllBestsellersDialog({ open, onOpenChange, products, filters }: { open: boolean, onOpenChange: (open: boolean) => void, products: AggregatedProduct[], filters: any }) {
    const { language } = useLanguage();
    const t = translations[language].finance.statementsPage;
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    useEffect(() => {
        if (!open) {
            setExpandedRows(new Set());
            setCurrentPage(1);
            setSearchTerm('');
        }
    }, [open]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lowercasedTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowercasedTerm) || 
            (p.sku && p.sku.toLowerCase().includes(lowercasedTerm))
        );
    }, [products, searchTerm]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t.allBestsellers}</DialogTitle>
                    <DialogDescription>
                        Menampilkan semua produk terlaris untuk periode yang dipilih.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk atau SKU..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-8"
                    />
                </div>
                <div className="flex-grow overflow-hidden flex flex-col">
                    <ScrollArea className="flex-grow">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead className="w-[50%]">{t.product}</TableHead>
                                    <TableHead className="text-right">{t.units}</TableHead>
                                    <TableHead className="text-right">{t.revenue}</TableHead>
                                    <TableHead className="text-right">{t.profit}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedProducts.map(p => (
                                    <React.Fragment key={p.productId}>
                                    <TableRow onClick={() => p.variants.length > 0 && toggleRow(p.productId)} className={cn(p.variants.length > 0 && "cursor-pointer", expandedRows.has(p.productId) && "bg-muted/50")}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                 <div className="w-4 shrink-0">
                                                    {p.variants.length > 0 && (
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows.has(p.productId) && "rotate-180")} />
                                                    )}
                                                </div>
                                                <Image src={p.imageUrl || 'https://placehold.co/40x40.png'} alt={p.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image" />
                                                <div>
                                                    <p className="font-medium text-sm">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">SKU: {p.sku || '-'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{p.unitsSold.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.profit)}</TableCell>
                                    </TableRow>
                                    {expandedRows.has(p.productId) && p.variants.map(v => (
                                         <TableRow key={v.variantId || p.productId}>
                                             <TableCell className="pl-16 py-2">
                                                 <div>
                                                     <p className="font-medium text-sm">{v.name}</p>
                                                     <p className="text-xs text-muted-foreground">SKU: {v.sku || 'N/A'}</p>
                                                 </div>
                                             </TableCell>
                                             <TableCell className="text-right py-2">{v.units.toLocaleString('id-ID')}</TableCell>
                                             <TableCell className="text-right py-2">{formatCurrency(v.revenue)}</TableCell>
                                             <TableCell className="text-right py-2">{formatCurrency(v.profit)}</TableCell>
                                         </TableRow>
                                    ))}
                                </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                 <DialogFooter className="pt-4 border-t flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                       Menampilkan {paginatedProducts.length} dari {filteredProducts.length} produk.
                    </div>
                    <div className="flex items-center gap-2">
                        <Pagination 
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                         <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[180px]">
                                <SelectValue placeholder={`${itemsPerPage} / halaman`} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {`${pageSize} / halaman`}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ComparisonBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
    if (previous === 0) {
        if (current > 0) {
            return (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>vs {label}</span>
                </p>
            );
        }
        return <p className="text-xs text-muted-foreground h-5 mt-1" />;
    }

    const percentChange = ((current - previous) / previous) * 100;

    if (Math.abs(percentChange) < 0.1) {
        return <p className="text-xs text-muted-foreground h-5 mt-1" />;
    }

    const isIncrease = percentChange > 0;
    const colorClass = isIncrease ? 'text-green-600' : 'text-red-600';
    const Icon = isIncrease ? TrendingUp : TrendingDown;
    const displayPercent = percentChange.toFixed(1).replace(/\.0$/, '');

    return (
        <p className={cn("text-xs flex items-center gap-1 mt-1", colorClass)}>
            <Icon className="h-4 w-4" />
            {isIncrease && '+'}{displayPercent}% vs {label}
        </p>
    );
}

const chartConfig = {
  Omzet: {
    label: "Omzet",
    color: "hsl(var(--chart-1))",
  },
  Laba: {
    label: "Laba Kotor",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function StatementsPage() {
    const { language } = useLanguage();
    const t = translations[language].finance.statementsPage;
    const { allSales, categories, loading } = useInventory();
    const { settings: financeSettings, isLoaded: financeSettingsLoaded } = useFinanceSettings();
    const { toast } = useToast();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [channelFilter, setChannelFilter] = useState<string | null>(null);
    const [isBestsellerDialogOpen, setBestsellerDialogOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);


    useEffect(() => {
        setDate({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    }, []);

    const {
        grossRevenue,
        grossProfit,
        netRevenue,
        netProfit,
        totalMarketplaceCut,
        unitsSold,
        cancelledSales,
        returnedSales,
        bestsellers,
        topCategories,
        topSizes,
        grossRevenuePrev,
        grossProfitPrev,
        netRevenuePrev,
        netProfitPrev,
        unitsSoldPrev,
        comparisonLabel,
        chartData,
    } = useMemo(() => {
        const initialState = {
            grossRevenue: 0, grossProfit: 0, netRevenue: 0, netProfit: 0, totalMarketplaceCut: 0, unitsSold: 0,
            cancelledSales: { count: 0, value: 0 }, returnedSales: { count: 0, value: 0 },
            bestsellers: [], topCategories: [], topSizes: [], chartData: [],
            grossRevenuePrev: 0, grossProfitPrev: 0, netRevenuePrev: 0, netProfitPrev: 0, unitsSoldPrev: 0,
            comparisonLabel: 'periode lalu'
        };
        
        if (!date?.from || !financeSettingsLoaded) return initialState;
        
        const toDate = date.to || date.from;

        const calculateMetricsForPeriod = (salesInPeriod: Sale[], dateRange: { from: Date, to: Date }) => {
            const filtered = salesInPeriod.filter(sale => {
                if (sale.accessoryId) return false;
                const categoryMatch = !categoryFilter || sale.productCategory === categoryFilter;
                const channelMatch = !channelFilter || sale.channel === channelFilter;
                return categoryMatch && channelMatch;
            });

            let revenue = 0;
            let profit = 0;
            let marketplaceCutTotal = 0;
            let units = 0;
            let cancelled = { count: 0, value: 0 };
            let returned = { count: 0, value: 0 };
            const productAggregation = new Map<string, AggregatedProduct>();
            const categoryAggregation = new Map<string, number>();
            const sizeAggregation = new Map<string, number>();
            const isOnlineSale = (channel: string) => ['shopee', 'tiktok', 'lazada'].some(c => channel.toLowerCase().includes(c));

            const dailySalesData: { [date: string]: { revenue: number, profit: number } } = {};
            if (dateRange.from && dateRange.to) {
                const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
                daysInInterval.forEach(day => {
                    const dateKey = formatToWIB(day, 'yyyy-MM-dd');
                    dailySalesData[dateKey] = { revenue: 0, profit: 0 };
                });
            }

            filtered.forEach(sale => {
                const salePrice = sale.priceAtSale * sale.quantity;
                const cogs = (sale.cogsAtSale ?? 0) * sale.quantity;
                const saleGrossProfit = salePrice - cogs;
                
                const saleMarketplaceCut = isOnlineSale(sale.channel) 
                    ? salePrice * (financeSettings.marketplaceFee / 100)
                    : 0;
                const saleNetProfit = saleGrossProfit - saleMarketplaceCut;

                if (sale.status === 'Cancelled' || sale.status === 'Dibatalkan') {
                    cancelled.count++;
                    cancelled.value += salePrice;
                    return;
                }
                if (sale.status === 'Return' || sale.status === 'Return Selesai') {
                    returned.count++;
                    returned.value += salePrice;
                    return;
                }

                if (['Completed', 'Siap Kirim', 'Selesai', 'Terproses', 'Diantar'].includes(sale.status || '')) {
                    revenue += salePrice;
                    units += sale.quantity;
                    profit += saleGrossProfit;
                    marketplaceCutTotal += saleMarketplaceCut;

                    const dateKey = formatToWIB(parseISO(sale.saleDate), 'yyyy-MM-dd');
                    if (dailySalesData[dateKey]) {
                        dailySalesData[dateKey].revenue += salePrice;
                        dailySalesData[dateKey].profit += saleGrossProfit;
                    }

                    const productId = sale.productId;
                    if (productId) {
                        if (!productAggregation.has(productId)) {
                            productAggregation.set(productId, {
                                productId: productId, name: sale.productName, sku: sale.parentSku, category: sale.productCategory,
                                imageUrl: sale.parentImageUrl, releaseDate: sale.releaseDate, unitsSold: 0, revenue: 0,
                                profit: 0, marketplaceCut: 0, netProfit: 0, variants: [],
                            });
                        }
                        const productAgg = productAggregation.get(productId)!;
                        productAgg.unitsSold += sale.quantity;
                        productAgg.revenue += salePrice;
                        productAgg.profit += saleGrossProfit;
                        productAgg.marketplaceCut += saleMarketplaceCut;
                        productAgg.netProfit += saleNetProfit;

                        const variantId = sale.variantId || null;
                        let variantAgg = productAgg.variants.find(v => v.variantId === variantId);
                        if (!variantAgg) {
                            variantAgg = { variantId, name: sale.variantName || sale.productName, sku: sale.sku, units: 0,
                                revenue: 0, profit: 0, marketplaceCut: 0, netProfit: 0,
                            };
                            productAgg.variants.push(variantAgg);
                        }
                        variantAgg.units += sale.quantity;
                        variantAgg.revenue += salePrice;
                        variantAgg.profit += saleGrossProfit;
                        variantAgg.marketplaceCut += saleMarketplaceCut;
                        variantAgg.netProfit += saleNetProfit;
                    }

                    if (sale.productCategory) {
                        categoryAggregation.set(sale.productCategory, (categoryAggregation.get(sale.productCategory) || 0) + sale.quantity);
                    }
                    if (sale.variantName) {
                        sizeAggregation.set(sale.variantName, (sizeAggregation.get(sale.variantName) || 0) + sale.quantity);
                    }
                }
            });
            
            productAggregation.forEach(p => p.variants.sort((a,b) => b.units - a.units));

            const finalChartData = Object.entries(dailySalesData).map(([dateStr, data]) => ({
                date: formatToWIB(parseISO(dateStr), 'd MMM'),
                Omzet: data.revenue,
                Laba: data.profit,
            }));

            return {
                grossRevenue: revenue,
                grossProfit: profit,
                netRevenue: revenue - marketplaceCutTotal,
                netProfit: profit - marketplaceCutTotal,
                totalMarketplaceCut: marketplaceCutTotal,
                unitsSold: units,
                cancelledSales: cancelled,
                returnedSales: returned,
                bestsellers: Array.from(productAggregation.values()).sort((a, b) => b.unitsSold - a.unitsSold),
                topCategories: Array.from(categoryAggregation.entries()).map(([name, units]) => ({ name, units })).sort((a,b) => b.units - a.units),
                topSizes: Array.from(sizeAggregation.entries()).map(([name, units]) => ({ name, units })).sort((a,b) => b.units - a.units),
                chartData: finalChartData,
            };
        };

        // --- Current Period ---
        const salesInDateRange = allSales.filter(sale => isWithinInterval(parseISO(sale.saleDate), { start: startOfDay(date.from!), end: endOfDay(toDate) }));
        const currentMetrics = calculateMetricsForPeriod(salesInDateRange, { from: date.from!, to: toDate });
        
        // --- Previous Period ---
        const diff = toDate.getTime() - date.from.getTime();
        const prevTo = subDays(date.from, 1);
        const prevFrom = new Date(prevTo.getTime() - diff);
        
        const salesInPrevDateRange = allSales.filter(sale => isWithinInterval(parseISO(sale.saleDate), { start: startOfDay(prevFrom), end: endOfDay(prevTo) }));
        const previousMetrics = calculateMetricsForPeriod(salesInPrevDateRange, { from: prevFrom, to: prevTo });
        
        let label = 'periode lalu';
        if (isSameDay(date.from, startOfMonth(date.from)) && isSameDay(toDate, endOfMonth(date.from))) {
            label = 'bulan lalu';
        } else if (isSameDay(date.from, startOfYear(date.from)) && isSameDay(toDate, endOfYear(date.from))) {
            label = 'tahun lalu';
        }
        
        return {
            ...currentMetrics,
            grossRevenuePrev: previousMetrics.grossRevenue,
            grossProfitPrev: previousMetrics.grossProfit,
            netRevenuePrev: previousMetrics.netRevenue,
            netProfitPrev: previousMetrics.netProfit,
            unitsSoldPrev: previousMetrics.unitsSold,
            comparisonLabel: label,
        };

    }, [allSales, date, categoryFilter, channelFilter, financeSettings.marketplaceFee, financeSettingsLoaded]);

    const datePresets = [
        { label: "Hari Ini", range: { from: new Date(), to: new Date() } },
        { label: "Bulan Ini", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: "Bulan Lalu", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
        { label: "Tahun Ini", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
    ];
    
    const salesChannels = [...new Set(allSales.map(s => s.channel))];

    const toggleRow = (productId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };
    
    const downloadExcel = useCallback(() => {
        setIsDownloading(true);
        const { id, update } = toast({ title: 'Memulai unduhan', description: 'Laporan penjualan Excel sedang disiapkan...' });

        setTimeout(() => {
            const dataToExport = [];
            
            bestsellers.forEach(product => {
                if (product.variants.length > 0) {
                     product.variants.forEach(variant => {
                         dataToExport.push({
                            "Nama Produk": `${product.name} - ${variant.name}`,
                            "SKU": variant.sku || '-',
                            "Kategori": product.category,
                            "Tanggal Rilis": product.releaseDate ? formatToWIB(parseISO(product.releaseDate), "yyyy-MM-dd") : '-',
                            "Unit Terjual": variant.units,
                            "Harga Jual Rata-rata": variant.units > 0 ? variant.revenue / variant.units : 0,
                            "Total Pendapatan": variant.revenue,
                            "Total Laba Kotor": variant.profit,
                            "Potongan Marketplace": variant.marketplaceCut,
                            "Laba Bersih": variant.netProfit
                         });
                     });
                } else {
                    dataToExport.push({
                        "Nama Produk": product.name,
                        "SKU": product.sku || '-',
                        "Kategori": product.category,
                        "Tanggal Rilis": product.releaseDate ? formatToWIB(parseISO(product.releaseDate), "yyyy-MM-dd") : '-',
                        "Unit Terjual": product.unitsSold,
                        "Harga Jual Rata-rata": product.unitsSold > 0 ? product.revenue / product.unitsSold : 0,
                        "Total Pendapatan": product.revenue,
                        "Total Laba Kotor": product.profit,
                        "Potongan Marketplace": product.marketplaceCut,
                        "Laba Bersih": product.netProfit,
                    });
                }
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            
            worksheet['!cols'] = [
                { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
                { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
                { wch: 20 }, { wch: 20 } 
            ];
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

            const dateFrom = date?.from ? formatToWIB(date.from, 'dd-MM-yy') : 'start';
            const dateTo = date?.to ? formatToWIB(date.to, 'dd-MM-yy') : 'end';
            const category = categoryFilter || 'semua_kategori';
            const channel = channelFilter || 'semua_kanal';

            const fileName = `Laporan_Penjualan_${category}_${channel}_${dateFrom}_sampai_${dateTo}.xlsx`;
            
            XLSX.writeFile(workbook, fileName);
            
            update({ id, title: "Unduhan Siap", description: `File '${fileName}' telah diunduh.` });
            setIsDownloading(false);
        }, 500);
    }, [bestsellers, date, categoryFilter, channelFilter, toast]);

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-8">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-2 mb-6">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={"w-full md:w-[260px] justify-start text-left font-normal"}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        `${formatToWIB(date.from, "d LLL, y")} - ${formatToWIB(date.to, "d LLL, y")}`
                                    ) : (
                                        formatToWIB(date.from, "d LLL, y")
                                    )
                                ) : (
                                    <span>{t.selectPeriod}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="flex w-auto flex-row" align="end">
                            <div className="flex flex-col gap-1 pr-4 border-r">
                                {datePresets.map(preset => {
                                    const isActive = date?.from && date.to && isSameDay(date.from, preset.range.from) && isSameDay(date.to, preset.range.to);
                                    return (
                                        <Button
                                            key={preset.label}
                                            variant={isActive ? "secondary" : "ghost"}
                                            className="justify-start"
                                            onClick={() => setDate(preset.range)}
                                        >
                                            {preset.label}
                                        </Button>
                                    );
                                })}
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
                    <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder={t.allCategories} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.allCategories}</SelectItem>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={channelFilter || 'all'} onValueChange={(value) => setChannelFilter(value === 'all' ? null : value)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder={t.allChannels} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.allChannels}</SelectItem>
                            {salesChannels.map(chan => <SelectItem key={chan} value={chan}>{chan}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={downloadExcel} variant="outline" disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        {isDownloading ? "Mengekspor..." : "Ekspor Excel"}
                    </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pendapatan Bersih</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(netRevenue)}</div>
                            <ComparisonBadge current={netRevenue} previous={netRevenuePrev} label={comparisonLabel} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                            <BarChart2 className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
                             <ComparisonBadge current={netProfit} previous={netProfitPrev} label={comparisonLabel} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.grossRevenue}</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(grossRevenue)}</div>
                            <ComparisonBadge current={grossRevenue} previous={grossRevenuePrev} label={comparisonLabel} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.grossProfit}</CardTitle>
                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
                             <ComparisonBadge current={grossProfit} previous={grossProfitPrev} label={comparisonLabel} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.unitsSold}</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{unitsSold.toLocaleString('id-ID')}</div>
                            <ComparisonBadge current={unitsSold} previous={unitsSoldPrev} label={comparisonLabel} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Potongan Marketplace</CardTitle>
                            <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalMarketplaceCut)}</div>
                            {financeSettingsLoaded ? (
                                <p className="text-xs text-muted-foreground">{financeSettings.marketplaceFee}% dari omzet</p>
                            ) : (
                                <Skeleton className="h-4 w-20 mt-1" />
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.cancelled}</CardTitle>
                            <ArrowDownRight className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(cancelledSales.value)}</div>
                            <p className="text-xs text-muted-foreground">{cancelledSales.count} transaksi</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.returned}</CardTitle>
                            <ArrowDownRight className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(returnedSales.value)}</div>
                             <p className="text-xs text-muted-foreground">{returnedSales.count} transaksi</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 mt-6 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Grafik Tren Penjualan</CardTitle>
                            <CardDescription>Menampilkan tren omzet dan laba kotor selama periode yang dipilih.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {chartData && chartData.length > 1 ? (
                                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                        <YAxis tickFormatter={(value) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value as number)} />
                                        <ChartTooltip 
                                            cursor={false} 
                                            content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />} 
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="Omzet" stroke="var(--color-Omzet)" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="Laba" stroke="var(--color-Laba)" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                    <p>Tidak cukup data untuk menampilkan grafik.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                 <div className="grid gap-6 mt-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t.bestsellers}</CardTitle>
                            {bestsellers.length > 10 && (
                                <Button variant="outline" size="sm" onClick={() => setBestsellerDialogOpen(true)}>{t.viewAll}</Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {bestsellers.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50%]">{t.product}</TableHead>
                                            <TableHead className="text-right">{t.units}</TableHead>
                                            <TableHead className="text-right">{t.revenue}</TableHead>
                                            <TableHead className="text-right">{t.profit}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bestsellers.slice(0, 10).map(p => (
                                            <React.Fragment key={p.productId}>
                                                <TableRow onClick={() => p.variants.length > 0 && toggleRow(p.productId)} className={cn(p.variants.length > 0 && "cursor-pointer", expandedRows.has(p.productId) && "bg-muted/50")}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-4 shrink-0">
                                                                {p.variants.length > 0 && (
                                                                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows.has(p.productId) && "rotate-180")} />
                                                                )}
                                                            </div>
                                                            <Image src={p.imageUrl || 'https://placehold.co/40x40.png'} alt={p.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image" />
                                                            <div>
                                                                <p className="font-medium text-sm">{p.name}</p>
                                                                <p className="text-xs text-muted-foreground">SKU: {p.sku || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{p.unitsSold.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(p.profit)}</TableCell>
                                                </TableRow>
                                                {expandedRows.has(p.productId) && p.variants.map(v => (
                                                     <TableRow key={v.variantId || p.productId}>
                                                         <TableCell className="pl-16 py-2">
                                                             <div>
                                                                 <p className="font-medium text-sm">{v.name}</p>
                                                                 <p className="text-xs text-muted-foreground">SKU: {v.sku || 'N/A'}</p>
                                                             </div>
                                                         </TableCell>
                                                         <TableCell className="text-right py-2">{v.units.toLocaleString('id-ID')}</TableCell>
                                                         <TableCell className="text-right py-2">{formatCurrency(v.revenue)}</TableCell>
                                                         <TableCell className="text-right py-2">{formatCurrency(v.profit)}</TableCell>
                                                     </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p className="font-semibold">{t.noSales}</p>
                                    <p>{t.noSalesDesc}</p>
                                </div>
                            )}
                        
                        </CardContent>
                    </Card>
                     <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center"><Star className="w-4 h-4 mr-2" /> Kategori Terlaris</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {topCategories.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kategori</TableHead>
                                                <TableHead className="text-right">Unit Terjual</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topCategories.slice(0, 5).map(c => (
                                                <TableRow key={c.name}>
                                                    <TableCell className="font-medium">{c.name}</TableCell>
                                                    <TableCell className="text-right">{c.units.toLocaleString('id-ID')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-4 text-sm text-muted-foreground">Tidak ada data.</div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> Ukuran Terlaris</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {topSizes.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Ukuran</TableHead>
                                                <TableHead className="text-right">Unit Terjual</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topSizes.slice(0, 5).map(s => (
                                                <TableRow key={s.name}>
                                                    <TableCell className="font-medium">{s.name}</TableCell>
                                                    <TableCell className="text-right">{s.units.toLocaleString('id-ID')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-4 text-sm text-muted-foreground">Tidak ada data.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 
                 <AllBestsellersDialog 
                    open={isBestsellerDialogOpen}
                    onOpenChange={setBestsellerDialogOpen}
                    products={bestsellers}
                    filters={{date, categoryFilter, channelFilter}}
                 />

            </main>
        </AppLayout>
    );
}

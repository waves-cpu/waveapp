

'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, TrendingUp, ShoppingCart, Activity, Eye, Search, Store, ChevronDown } from "lucide-react";
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { subDays, isWithinInterval, startOfDay, endOfDay, format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, InventoryItemVariant, Sale } from '@/types';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from 'next/image';


const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const CHANNEL_COLORS: { [key: string]: string } = {
  pos: "hsl(var(--chart-1))",
  reseller: "hsl(var(--chart-2))",
  shopee: "hsl(var(--chart-3))",
  tiktok: "hsl(var(--chart-4))",
  lazada: "hsl(var(--chart-5))",
  default: "hsl(var(--muted-foreground))",
};


interface ProfitabilityData {
    productId: string;
    name: string;
    sku?: string;
    category: string;
    unitsSold: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    imageUrl?: string;
    variants?: VariantProfitabilityData[];
}

interface VariantProfitabilityData {
    variantId: string;
    name: string;
    sku?: string;
    unitsSold: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
}


function FinancialReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
            </div>
            <div className="grid md:grid-cols-5 gap-4">
                <Card className="md:col-span-2">
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                </Card>
                 <Card className="md:col-span-3">
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                </Card>
            </div>
        </div>
    )
}

function AllProductsDialog({
    open,
    onOpenChange,
    allSales,
    categories,
    initialDateRange,
    initialAllProducts
} : {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allSales: Sale[];
    categories: string[];
    initialDateRange: DateRange | undefined;
    initialAllProducts: InventoryItem[];
}) {
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);

    const productMap = useMemo(() => {
        const map = new Map<string, {name: string, sku?: string, category: string, imageUrl?: string}>();
        initialAllProducts.forEach(p => map.set(p.id, {
            name: p.name,
            sku: p.sku,
            category: p.category,
            imageUrl: p.imageUrl,
        }));
        return map;
    }, [initialAllProducts]);
    
    const productProfitability = useMemo(() => {
        const salesInDateRange = allSales.filter(sale => {
            if (!dateRange || !dateRange.from) return true;
            const saleDate = parseISO(sale.saleDate);
            const toDate = dateRange.to || dateRange.from;
            return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(toDate) });
        });
        
        const profitabilityMap = new Map<string, ProfitabilityData>();

        salesInDateRange.forEach(sale => {
            const parentProductId = sale.productId;
            if (!parentProductId) return;

            const productDetails = productMap.get(parentProductId);
            
            if (!profitabilityMap.has(parentProductId)) {
                 profitabilityMap.set(parentProductId, {
                    productId: parentProductId,
                    name: productDetails?.name || sale.productName,
                    sku: sale.parentSku || productDetails?.sku || sale.sku,
                    category: productDetails?.category || sale.productCategory,
                    imageUrl: productDetails?.imageUrl,
                    unitsSold: 0,
                    totalRevenue: 0,
                    totalCogs: 0,
                    grossProfit: 0,
                    variants: [],
                });
            }
            
            const saleRevenue = sale.priceAtSale * sale.quantity;
            const saleCogs = (sale.cogsAtSale || 0) * sale.quantity;
            
            const productProfit = profitabilityMap.get(parentProductId)!;
            productProfit.unitsSold += sale.quantity;
            productProfit.totalRevenue += saleRevenue;
            productProfit.totalCogs += saleCogs;
            productProfit.grossProfit += (saleRevenue - saleCogs);
            
            if (sale.variantId) {
                if (!productProfit.variants) {
                    productProfit.variants = [];
                }
                let variantProfit = productProfit.variants.find(v => v.variantId === sale.variantId);
                if (!variantProfit) {
                    variantProfit = {
                        variantId: sale.variantId,
                        name: sale.variantName || 'Unknown Variant',
                        sku: sale.sku,
                        unitsSold: 0,
                        totalRevenue: 0,
                        totalCogs: 0,
                        grossProfit: 0,
                    };
                    productProfit.variants.push(variantProfit);
                }
                variantProfit.unitsSold += sale.quantity;
                variantProfit.totalRevenue += saleRevenue;
                variantProfit.totalCogs += saleCogs;
                variantProfit.grossProfit += (saleRevenue - saleCogs);
            }
        });

        profitabilityMap.forEach(p => {
            if (p.variants) {
                p.variants.sort((a,b) => b.unitsSold - a.unitsSold);
            }
        });

        return Array.from(profitabilityMap.values()).sort((a,b) => b.unitsSold - a.unitsSold);
    }, [allSales, dateRange, productMap]);


    const filteredData = useMemo(() => {
        return productProfitability
            .filter(p => !categoryFilter || p.category === categoryFilter)
            .filter(p => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                const productMatch = p.name.toLowerCase().includes(lowerSearch) || (p.sku && p.sku.toLowerCase().includes(lowerSearch));
                if (productMatch) return true;
                if (p.variants) {
                    return p.variants.some(v => v.name.toLowerCase().includes(lowerSearch) || (v.sku && v.sku.toLowerCase().includes(lowerSearch)));
                }
                return false;
            })
            .sort((a,b) => b.unitsSold - a.unitsSold);

    }, [productProfitability, categoryFilter, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Semua Produk Terlaris</DialogTitle>
                    <DialogDescription>Diurutkan berdasarkan unit terjual terbanyak.</DialogDescription>
                </DialogHeader>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari produk atau SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date-dialog"
                            variant={"outline"}
                            className={cn(
                            "w-full sm:w-[240px] justify-start text-left font-normal",
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
                            <span>Pilih rentang tanggal</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="flex-grow overflow-hidden border rounded-md">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card">
                                <TableRow>
                                    <TableHead className="text-xs">Produk</TableHead>
                                    <TableHead className="text-center text-xs">Terjual</TableHead>
                                    <TableHead className="text-left text-xs">Omzet</TableHead>
                                    <TableHead className="text-left text-xs">HPP</TableHead>
                                    <TableHead className="text-left text-xs">Laba Kotor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.flatMap((p) => {
                                    const hasVariants = p.variants && p.variants.length > 0;
                                    const productRow = (
                                        <TableRow key={p.productId}>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-3">
                                                    <Image src={p.imageUrl || 'https://placehold.co/30x30.png'} alt={p.name} width={30} height={30} className="rounded-md" data-ai-hint="product image" />
                                                    <div>
                                                        <div className="font-medium text-sm">{p.name}</div>
                                                        <div className="text-muted-foreground font-normal text-xs">SKU: {p.sku || '-'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium py-2">{p.unitsSold}</TableCell>
                                            <TableCell className="text-left text-xs font-medium py-2">{formatCurrency(p.totalRevenue)}</TableCell>
                                            <TableCell className="text-left text-xs font-medium py-2">{formatCurrency(p.totalCogs)}</TableCell>
                                            <TableCell className="text-left font-medium text-xs py-2">{formatCurrency(p.grossProfit)}</TableCell>
                                        </TableRow>
                                    );

                                    const variantRows = hasVariants ? (p.variants || [])
                                        .filter(v => {
                                            if (!searchTerm) return true;
                                            const lowerSearch = searchTerm.toLowerCase();
                                            return v.name.toLowerCase().includes(lowerSearch) || (v.sku && v.sku.toLowerCase().includes(lowerSearch));
                                        })
                                        .map(v => (
                                            <TableRow key={`variant-${v.variantId}`} className="hover:bg-muted/50">
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                            <Store className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm">{v.name}</div>
                                                            <div className="text-xs text-muted-foreground">SKU: {v.sku || '-'}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-xs py-2">{v.unitsSold}</TableCell>
                                                <TableCell className="text-left text-xs py-2">{formatCurrency(v.totalRevenue)}</TableCell>
                                                <TableCell className="text-left text-xs py-2">{formatCurrency(v.totalCogs)}</TableCell>
                                                <TableCell className="text-left font-semibold text-xs py-2">{formatCurrency(v.grossProfit)}</TableCell>
                                            </TableRow>
                                        )) : [];
                                    
                                    return [productRow, ...variantRows];
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                 <DialogFooter className="border-t pt-4">
                     {filteredData.length > 1 && (
                        <p className="text-sm text-muted-foreground">Menampilkan {filteredData.length} dari {productProfitability.length} produk.</p>
                     )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SalesReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TFinance = t.finance;
    const { items, allSales, loading, categories } = useInventory();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [isTopProductsDialogOpen, setIsTopProductsDialogOpen] = useState(false);

    const { 
        totalRevenue,
        totalCogs,
        grossProfit,
        salesByChannel,
        productProfitability,
        totalUnitsSold
    } = useMemo(() => {
        const salesInDateRange = allSales.filter(sale => {
            if (categoryFilter && sale.productCategory !== categoryFilter) return false;
            if (!dateRange || !dateRange.from) return true;
            const saleDate = parseISO(sale.saleDate);
            const toDate = dateRange.to || dateRange.from;
            return isWithinInterval(saleDate, { start: startOfDay(dateRange.from), end: endOfDay(toDate) });
        });

        let revenue = 0;
        let cogs = 0;
        let units = 0;
        const channelSales: { [key: string]: number } = {};
        const profitabilityMap = new Map<string, ProfitabilityData>();

        salesInDateRange.forEach(sale => {
            const parentProductId = sale.productId;
             if (!parentProductId) return;
            
            const saleRevenue = sale.priceAtSale * sale.quantity;
            const saleCogs = (sale.cogsAtSale || 0) * sale.quantity;
            
            revenue += saleRevenue;
            cogs += saleCogs;
            units += sale.quantity;

            channelSales[sale.channel] = (channelSales[sale.channel] || 0) + saleRevenue;

            if (!profitabilityMap.has(parentProductId)) {
                profitabilityMap.set(parentProductId, {
                    productId: parentProductId,
                    name: sale.productName,
                    sku: sale.parentSku,
                    category: sale.productCategory,
                    unitsSold: 0,
                    totalRevenue: 0,
                    totalCogs: 0,
                    grossProfit: 0,
                });
            }

            const current = profitabilityMap.get(parentProductId)!;
            current.unitsSold += sale.quantity;
            current.totalRevenue += saleRevenue;
            current.totalCogs += saleCogs;
            current.grossProfit += (saleRevenue - saleCogs);
        });

        return {
            totalRevenue: revenue,
            totalCogs: cogs,
            grossProfit: revenue - cogs,
            totalUnitsSold: units,
            salesByChannel: Object.entries(channelSales).map(([name, value]) => ({ 
                name: name.charAt(0).toUpperCase() + name.slice(1), 
                value, 
                fill: CHANNEL_COLORS[name] || CHANNEL_COLORS.default 
            })).sort((a,b) => b.value - a.value),
            productProfitability: Array.from(profitabilityMap.values()).sort((a,b) => b.unitsSold - a.unitsSold),
        };

    }, [allSales, dateRange, categoryFilter]);


    const pieChartConfig = useMemo(() => {
        const config: ChartConfig = {};
        salesByChannel.forEach(channel => {
            config[channel.name] = {
                label: channel.name,
                color: channel.fill
            }
        });
        return config;
    }, [salesByChannel]);


    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{TFinance.salesReport}</h1>
                    </div>
                    <FinancialReportSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10 pb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{TFinance.salesReport}</h1>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                            <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
                            {categories.map((category) => (
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
                                <span>Pilih rentang tanggal</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Omzet</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total HPP</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalCogs)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unit Terjual</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUnitsSold.toLocaleString('id-ID')}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-5 gap-4">
                     <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Omzet per Kanal</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {salesByChannel.length > 0 ? (
                                <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-[250px]">
                                    <RechartsPieChart>
                                        <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} hideLabel />} />
                                        <Pie data={salesByChannel} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                            {salesByChannel.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Legend content={({ payload }) => (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-4 text-xs">
                                                {payload?.map((entry) => (
                                                    <div key={entry.value} className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                        <span>{entry.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )} />
                                    </RechartsPieChart>
                                </ChartContainer>
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Tidak ada data penjualan</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-3 flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base">
                                  Top 10 {categoryFilter ? `${categoryFilter} ` : ''}Produk Terlaris
                                </CardTitle>
                                <CardDescription>Diurutkan berdasarkan unit terjual terbanyak</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsTopProductsDialogOpen(true)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead className="text-xs">Produk</TableHead>
                                            <TableHead className="text-center text-xs">Terjual</TableHead>
                                            <TableHead className="text-left text-xs">Omzet</TableHead>
                                            <TableHead className="text-left text-xs">Laba Kotor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productProfitability.slice(0, 10).length > 0 ? productProfitability.slice(0, 10).map(p => (
                                            <TableRow key={p.productId}>
                                                <TableCell className="font-medium text-xs py-2">
                                                    <div>{p.name}</div>
                                                    <div className="text-muted-foreground">SKU: {p.sku || '-'}</div>
                                                </TableCell>
                                                <TableCell className="text-center text-xs font-bold py-2">{p.unitsSold}</TableCell>
                                                <TableCell className="text-left text-xs py-2">{formatCurrency(p.totalRevenue)}</TableCell>
                                                <TableCell className="text-left font-semibold text-xs py-2">{formatCurrency(p.grossProfit)}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                                    Tidak ada data profitabilitas untuk ditampilkan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </main>
             <AllProductsDialog
                open={isTopProductsDialogOpen}
                onOpenChange={setIsTopProductsDialogOpen}
                allSales={allSales}
                categories={categories}
                initialDateRange={dateRange}
                initialAllProducts={items}
            />
        </AppLayout>
    );
}



    

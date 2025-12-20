
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { Sale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, DollarSign, BarChart2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

interface AggregatedProduct {
    productId: string;
    variantId?: string;
    name: string;
    sku?: string;
    category: string;
    imageUrl?: string;
    units: number;
    revenue: number;
    profit: number;
}

function AllBestsellersDialog({ open, onOpenChange, products, filters }: { open: boolean, onOpenChange: (open: boolean) => void, products: AggregatedProduct[], filters: any }) {
    const { language } = useLanguage();
    const t = translations[language].finance.statementsPage;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t.allBestsellers}</DialogTitle>
                    <DialogDescription>
                        {/* You can add a description of the filters here */}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead>{t.product}</TableHead>
                                <TableHead>{t.sku}</TableHead>
                                <TableHead>{t.category}</TableHead>
                                <TableHead className="text-right">{t.units}</TableHead>
                                <TableHead className="text-right">{t.revenue}</TableHead>
                                <TableHead className="text-right">{t.profit}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map(p => (
                                <TableRow key={p.variantId || p.productId}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Image src={p.imageUrl || 'https://placehold.co/40x40.png'} alt={p.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image" />
                                            <span className="font-medium text-sm">{p.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{p.sku || '-'}</TableCell>
                                    <TableCell>{p.category}</TableCell>
                                    <TableCell className="text-right">{p.units.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.profit)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default function StatementsPage() {
    const { language } = useLanguage();
    const t = translations[language].finance.statementsPage;
    const { allSales, categories, loading } = useInventory();

    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [channelFilter, setChannelFilter] = useState<string | null>(null);
    const [isBestsellerDialogOpen, setBestsellerDialogOpen] = useState(false);

    useEffect(() => {
        setDate({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    }, []);

    const {
        grossRevenue,
        grossProfit,
        unitsSold,
        cancelledSales,
        returnedSales,
        bestsellers,
    } = useMemo(() => {
        if (!date?.from) return { grossRevenue: 0, grossProfit: 0, unitsSold: 0, cancelledSales: { count: 0, value: 0 }, returnedSales: { count: 0, value: 0 }, bestsellers: [] };
        
        const salesInDateRange = allSales.filter(sale => {
            const saleDate = parseISO(sale.saleDate);
            const toDate = date.to || date.from;
            return isWithinInterval(saleDate, { start: startOfDay(date.from!), end: endOfDay(toDate) });
        });
        
        const filteredSales = salesInDateRange.filter(sale => {
            const categoryMatch = !categoryFilter || sale.productCategory === categoryFilter;
            const channelMatch = !channelFilter || sale.channel === channelFilter;
            return categoryMatch && channelMatch;
        });

        let revenue = 0;
        let profit = 0;
        let units = 0;
        let cancelled = { count: 0, value: 0 };
        let returned = { count: 0, value: 0 };
        const productAggregation = new Map<string, AggregatedProduct>();

        filteredSales.forEach(sale => {
            const saleKey = sale.variantId || sale.productId;
            if (!saleKey) return;
            
            const salePrice = sale.priceAtSale * sale.quantity;
            const cogs = (sale.cogsAtSale ?? 0) * sale.quantity;
            const saleProfit = salePrice - cogs;

            if (sale.status === 'Cancelled' || sale.status === 'Dibatalkan') {
                cancelled.count++;
                cancelled.value += salePrice;
                return; // Do not include in main calculations
            }
            if (sale.status === 'Return' || sale.status === 'Return Selesai') {
                returned.count++;
                returned.value += salePrice;
                // Subtract from revenue and profit
                revenue -= salePrice;
                profit -= saleProfit;
                // No change in units sold, as it was sold and then returned. If you want to track net units, you would subtract here.
                return; 
            }

            // Only count 'Completed' or 'Dikirim' or 'Selesai' for revenue and units
            if (['Completed', 'Dikirim', 'Selesai'].includes(sale.status || '')) {
                revenue += salePrice;
                units += sale.quantity;
                profit += saleProfit;

                if (!productAggregation.has(saleKey)) {
                    productAggregation.set(saleKey, {
                        productId: sale.productId!,
                        variantId: sale.variantId,
                        name: sale.variantName ? `${sale.productName} - ${sale.variantName}` : sale.productName,
                        sku: sale.sku,
                        category: sale.productCategory,
                        imageUrl: sale.parentImageUrl,
                        units: 0,
                        revenue: 0,
                        profit: 0
                    });
                }
                const agg = productAggregation.get(saleKey)!;
                agg.units += sale.quantity;
                agg.revenue += salePrice;
                agg.profit += saleProfit;
            }
        });
        
        const sortedBestsellers = Array.from(productAggregation.values()).sort((a, b) => b.units - a.units);

        return {
            grossRevenue: revenue,
            grossProfit: profit,
            unitsSold: units,
            cancelledSales: cancelled,
            returnedSales: returned,
            bestsellers: sortedBestsellers
        };
    }, [allSales, date, categoryFilter, channelFilter]);

    const datePresets = [
        { label: t.today, range: { from: new Date(), to: new Date() } },
        { label: t.last7Days, range: { from: subDays(new Date(), 6), to: new Date() } },
        { label: t.last30Days, range: { from: subDays(new Date(), 29), to: new Date() } },
        { label: t.thisMonth, range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: t.thisYear, range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
    ];
    
    const salesChannels = [...new Set(allSales.map(s => s.channel))];

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
                                        `${format(date.from, "d LLL, y")} - ${format(date.to, "d LLL, y")}`
                                    ) : (
                                        format(date.from, "d LLL, y")
                                    )
                                ) : (
                                    <span>{t.selectPeriod}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="flex w-auto flex-col gap-y-2 p-2" align="start">
                            <div className="grid grid-cols-2 gap-2">
                                {datePresets.map(preset => (
                                    <Button key={preset.label} variant="ghost" onClick={() => setDate(preset.range)}>{preset.label}</Button>
                                ))}
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
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
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.grossRevenue}</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(grossRevenue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.grossProfit}</CardTitle>
                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t.unitsSold}</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{unitsSold.toLocaleString('id-ID')}</div>
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
                
                 <Card className="mt-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{t.bestsellers}</CardTitle>
                         {bestsellers.length > 5 && (
                            <Button variant="outline" size="sm" onClick={() => setBestsellerDialogOpen(true)}>{t.viewAll}</Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {bestsellers.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.product}</TableHead>
                                        <TableHead>{t.sku}</TableHead>
                                        <TableHead>{t.category}</TableHead>
                                        <TableHead className="text-right">{t.units}</TableHead>
                                        <TableHead className="text-right">{t.revenue}</TableHead>
                                        <TableHead className="text-right">{t.profit}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bestsellers.slice(0, 5).map(p => (
                                         <TableRow key={p.variantId || p.productId}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Image src={p.imageUrl || 'https://placehold.co/40x40.png'} alt={p.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image" />
                                                    <span className="font-medium text-sm">{p.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{p.sku || '-'}</TableCell>
                                            <TableCell>{p.category}</TableCell>
                                            <TableCell className="text-right">{p.units.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(p.profit)}</TableCell>
                                        </TableRow>
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

'use client';

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart2, DollarSign, Package, ShoppingCart, Calendar as CalendarIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import type { InventoryItem, Sale, InventoryItemVariant } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Cell } from "recharts"
import { DateRange } from 'react-day-picker';
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, startOfYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

const chartConfig = {
  units: {
    label: "Unit",
  },
  revenue: {
    label: "Omzet",
  },
} satisfies ChartConfig

function ProductAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const { items, allSales, loading: inventoryLoading } = useInventory();
    const { settings: financeSettings, isLoaded: financeSettingsLoaded } = useFinanceSettings();
    const id = typeof params.id === 'string' ? params.id : '';

    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const isOnlineSale = (channel: string) => {
        return ['shopee', 'tiktok', 'lazada'].some(c => channel.toLowerCase().includes(c));
    }

    const { product, productSales } = useMemo(() => {
        if (!id || inventoryLoading) return { product: null, productSales: [] };
        const foundProduct = items.find(i => i.id === id);
        if (!foundProduct) return { product: null, productSales: [] };
        
        const sales = allSales.filter(sale => {
            const isProductMatch = sale.productId === id;
            if (!isProductMatch) return false;

            const isStatusMatch = sale.status && ['Completed', 'Siap Kirim', 'Selesai', 'Terproses', 'Diantar'].includes(sale.status);
            if (!isStatusMatch) return false;

            if (date?.from) {
                const saleDate = parseISO(sale.saleDate);
                const toDate = date.to || date.from;
                if (!isWithinInterval(saleDate, { start: startOfDay(date.from), end: endOfDay(toDate) })) {
                    return false;
                }
            }
            
            return true;
        });

        return { product: foundProduct, productSales: sales };
    }, [id, items, allSales, inventoryLoading, date]);

    const analytics = useMemo(() => {
        if (!product || !financeSettingsLoaded) {
            return null;
        }

        let totalUnitsSold = 0;
        let totalRevenue = 0;
        let totalGrossProfit = 0;
        
        const variantsPerformance: Record<string, { name: string; sku: string; unitsSold: number; revenue: number; grossProfit: number }> = {};
        if (product.variants) {
            product.variants.forEach(v => {
                variantsPerformance[v.id] = { name: v.name, sku: v.sku || '', unitsSold: 0, revenue: 0, grossProfit: 0 };
            });
        }

        const salesByChannel: Record<string, { unitsSold: number; revenue: number; }> = {};

        productSales.forEach(sale => {
            totalUnitsSold += sale.quantity;
            const saleRevenue = sale.priceAtSale * sale.quantity;
            totalRevenue += saleRevenue;
            const saleProfit = saleRevenue - ((sale.cogsAtSale ?? 0) * sale.quantity);
            totalGrossProfit += saleProfit;

            // Channel analytics
            const channel = sale.channel || 'Unknown';
            if (!salesByChannel[channel]) {
                salesByChannel[channel] = { unitsSold: 0, revenue: 0 };
            }
            salesByChannel[channel].unitsSold += sale.quantity;
            salesByChannel[channel].revenue += saleRevenue;

            // Variant analytics
            if (sale.variantId && variantsPerformance[sale.variantId]) {
                variantsPerformance[sale.variantId].unitsSold += sale.quantity;
                variantsPerformance[sale.variantId].revenue += saleRevenue;
                variantsPerformance[sale.variantId].grossProfit += saleProfit;
            }
        });
        
        const onlineRevenue = Object.entries(salesByChannel).reduce((acc, [channel, data]) => {
            if (isOnlineSale(channel)) {
                return acc + data.revenue;
            }
            return acc;
        }, 0);

        const totalMarketplaceCut = onlineRevenue * (financeSettings.marketplaceFee / 100);
        const netProfit = totalGrossProfit - totalMarketplaceCut;

        const chartData = Object.entries(salesByChannel).map(([channel, data]) => ({
            channel,
            units: data.unitsSold,
            revenue: data.revenue
        }));

        return {
            totalUnitsSold,
            totalRevenue,
            totalGrossProfit,
            netProfit,
            variantsPerformance,
            salesByChannel,
            chartData
        };

    }, [product, productSales, financeSettings, financeSettingsLoaded]);

     const datePresets = [
        { label: "Hari Ini", range: { from: new Date(), to: new Date() } },
        { label: "Bulan Ini", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: "Tahun Ini", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
        { label: "30 Hari Terakhir", range: { from: subDays(new Date(), 29), to: new Date() } },
    ];
    
    if (inventoryLoading || !financeSettingsLoaded) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                     <Skeleton className="h-8 w-48" />
                    <div className="grid gap-6 md:grid-cols-3">
                        <Skeleton className="h-48 md:col-span-1" />
                        <Skeleton className="h-96 md:col-span-2" />
                    </div>
                </main>
            </AppLayout>
        );
    }
    
    if (!product) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <p>Produk tidak ditemukan.</p>
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                 <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">Analisis Produk</h1>
                            <p className="text-sm text-muted-foreground">{product.name}</p>
                        </div>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal",
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
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Omzet</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{formatCurrency(analytics?.netProfit || 0)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unit Terjual</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{analytics?.totalUnitsSold.toLocaleString('id-ID') || 0}</div></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{product.variants ? product.variants.reduce((sum, v) => sum + v.stock, 0) : product.stock}</div></CardContent>
                    </Card>
                </div>
                
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                             <CardHeader>
                                <CardTitle>Performa Varian</CardTitle>
                                <CardDescription>Rincian penjualan untuk setiap varian produk ini.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Varian</TableHead><TableHead className="text-right">Unit Terjual</TableHead><TableHead className="text-right">Omzet</TableHead><TableHead className="text-right">Laba Kotor</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {product.variants && Object.values(analytics?.variantsPerformance || {}).length > 0 ? Object.values(analytics!.variantsPerformance).map(v => (
                                            <TableRow key={v.sku}><TableCell className="font-medium">{v.name}<p className="text-xs text-muted-foreground font-mono">{v.sku}</p></TableCell><TableCell className="text-right">{v.unitsSold.toLocaleString('id-ID')}</TableCell><TableCell className="text-right">{formatCurrency(v.revenue)}</TableCell><TableCell className="text-right">{formatCurrency(v.grossProfit)}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data penjualan varian atau produk ini tidak memiliki varian.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Penjualan per Kanal</CardTitle>
                            </CardHeader>
                            <CardContent>
                               {analytics && analytics.chartData.length > 0 ? (
                                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                        <BarChart data={analytics.chartData} layout="vertical" margin={{ left: 10 }}>
                                            <CartesianGrid horizontal={false} />
                                            <YAxis dataKey="channel" type="category" tickLine={false} axisLine={false} tickMargin={10} />
                                            <XAxis type="number" hide />
                                            <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                            <Legend />
                                            <Bar dataKey="units" name="Unit" radius={4}>
                                                {analytics.chartData.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={`var(--color-chart-${(index % 5) + 1})`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                               ) : <p className="text-sm text-muted-foreground text-center py-10">Tidak ada data penjualan.</p>}
                            </CardContent>
                        </Card>
                    </div>
                 </div>
            </main>
        </AppLayout>
    );
}

export default ProductAnalyticsPage;

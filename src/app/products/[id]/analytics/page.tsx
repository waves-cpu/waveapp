
'use client';

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart2, DollarSign, Package, ShoppingCart, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, Ban, Undo2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useFinanceSettings } from '@/hooks/use-finance-settings';
import type { InventoryItem, Sale, InventoryItemVariant, AdjustmentHistory } from '@/types';
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
import { isWithinInterval, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';


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
  pos: {
    label: "POS",
    color: "hsl(var(--chart-1))",
  },
  shopee: {
    label: "Shopee",
    color: "hsl(var(--chart-2))",
  },
  tiktok: {
    label: "Tiktok",
    color: "hsl(var(--chart-3))",
  },
  reseller: {
    label: "Reseller",
    color: "hsl(var(--chart-4))",
  },
  lazada: {
    label: "Lazada",
    color: "hsl(var(--chart-5))",
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
    
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    
    const isOnlineSale = (channel: string) => {
        return ['shopee', 'tiktok', 'lazada'].some(c => channel.toLowerCase().includes(c));
    }

    const { product, productAllSalesInDateRange } = useMemo(() => {
        if (!id || inventoryLoading) return { product: null, productAllSalesInDateRange: [] };

        const foundProduct = items.find(i => i.id === id);
        if (!foundProduct) return { product: null, productAllSalesInDateRange: [] };
        
        const sales = allSales.filter(sale => {
            const isProductMatch = sale.productId === id;
            if (!isProductMatch) return false;

            if (date?.from) {
                const saleDate = parseISO(sale.saleDate);
                const toDate = date.to || date.from;
                return isWithinInterval(saleDate, { start: startOfDay(date.from), end: endOfDay(toDate) });
            }
            
            return true;
        });

        return { product: foundProduct, productAllSalesInDateRange: sales };
    }, [id, items, allSales, inventoryLoading, date]);

    const analytics = useMemo(() => {
        if (!product || !financeSettingsLoaded) {
            return null;
        }

        const productSales = productAllSalesInDateRange.filter(sale =>
            sale.status && ['Completed', 'Siap Kirim', 'Selesai', 'Terproses', 'Diantar'].includes(sale.status)
        );

        const cancelledSales = productAllSalesInDateRange.filter(sale =>
            sale.status && ['Cancelled', 'Dibatalkan'].includes(sale.status)
        );

        const returnedSales = productAllSalesInDateRange.filter(sale =>
            sale.status && ['Return', 'Return Selesai'].includes(sale.status)
        );

        const totalCancelledUnits = cancelledSales.reduce((sum, sale) => sum + sale.quantity, 0);
        const totalReturnedUnits = returnedSales.reduce((sum, sale) => sum + sale.quantity, 0);

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

            const channel = sale.channel || 'Unknown';
            if (!salesByChannel[channel]) {
                salesByChannel[channel] = { unitsSold: 0, revenue: 0 };
            }
            salesByChannel[channel].unitsSold += sale.quantity;
            salesByChannel[channel].revenue += saleRevenue;

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

        let totalStockIn = 0;
        let totalStockOut = 0;
        const manualAdjustments: (AdjustmentHistory & {itemName?: string, variantName?: string})[] = [];

        const processHistory = (history: AdjustmentHistory[], parent: InventoryItem, variant?: InventoryItemVariant) => {
            history.forEach(entry => {
                const entryDate = parseISO(entry.date as any);
                const toDate = date?.to || date?.from;
                
                if (date?.from && toDate && isWithinInterval(entryDate, { start: startOfDay(date.from), end: endOfDay(toDate) })) {
                    const reason = entry.reason.toLowerCase();
                    const isSaleRelated = reason.includes('sale') || reason.includes('pemakaian aksesoris') || reason.includes('penjualan') || reason.includes('cancelled');
                    
                    if (!isSaleRelated) {
                        if (entry.change > 0) {
                            totalStockIn += entry.change;
                        } else if (entry.change < 0) {
                            totalStockOut += Math.abs(entry.change);
                        }
                        manualAdjustments.push({
                            ...entry,
                            itemName: parent.name,
                            variantName: variant?.name,
                        });
                    }
                }
            });
        };

        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                if (variant.history) {
                    processHistory(variant.history, product, variant);
                }
            });
        } else if (product.history) {
            processHistory(product.history, product);
        }
        
        manualAdjustments.sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());

        return {
            totalUnitsSold,
            totalRevenue,
            totalGrossProfit,
            netProfit,
            variantsPerformance,
            salesByChannel,
            chartData,
            totalCancelledUnits,
            totalReturnedUnits,
            totalStockIn,
            totalStockOut,
            manualAdjustments,
        };

    }, [product, productAllSalesInDateRange, financeSettings, financeSettingsLoaded, date]);

     const datePresets = [
        { label: "Hari Ini", range: { from: new Date(), to: new Date() } },
        { label: "Bulan Ini", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: "Tahun Ini", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
        { label: "30 Hari Terakhir", range: { from: subDays(new Date(), 29), to: new Date() } },
    ];
    
    const displayedAdjustments = useMemo(() => {
        if (!analytics) return [];
        return analytics.manualAdjustments.slice(0, 5);
    }, [analytics]);
    
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
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <Image src={product.imageUrl || 'https://placehold.co/400x400.png'} alt={product.name} width={400} height={400} className="rounded-lg w-full aspect-square object-cover" />
                            </CardHeader>
                            <CardContent>
                                <h2 className="text-xl font-bold">{product.name}</h2>
                                <p className="text-sm text-muted-foreground">{product.category}</p>
                                <p className="text-sm font-mono bg-muted px-2 py-1 rounded-md inline-block mt-2">SKU: {product.sku || 'N/A'}</p>
                                 <div className="mt-4 border-t pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Total Stok Saat Ini:</span>
                                        <span className="font-bold text-lg">{product.variants ? product.variants.reduce((sum, v) => sum + v.stock, 0) : product.stock}</span>
                                    </div>
                                 </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Omzet</CardTitle>
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
                                    <CardTitle className="text-sm font-medium">Diretur</CardTitle>
                                    <Undo2 className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">{analytics?.totalReturnedUnits.toLocaleString('id-ID') || 0}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Dibatalkan</CardTitle>
                                    <Ban className="h-4 w-4 text-destructive" />
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">{analytics?.totalCancelledUnits.toLocaleString('id-ID') || 0}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Stok Masuk</CardTitle>
                                    <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">{analytics?.totalStockIn.toLocaleString('id-ID') || 0}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Stok Keluar</CardTitle>
                                    <ArrowDownCircle className="h-4 w-4 text-red-500" />
                                </CardHeader>
                                <CardContent><div className="text-2xl font-bold">{analytics?.totalStockOut.toLocaleString('id-ID') || 0}</div></CardContent>
                            </Card>
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Penjualan per Kanal</CardTitle>
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
                                                {analytics.chartData.map((entry) => (
                                                    <Cell key={`cell-${entry.channel}`} fill={chartConfig[entry.channel.toLowerCase() as keyof typeof chartConfig]?.color || "hsl(var(--chart-1))" } />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                               ) : <p className="text-sm text-muted-foreground text-center py-10">Tidak ada data penjualan.</p>}
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle className="text-base">Performa Varian</CardTitle>
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

                         <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Riwayat Stok Manual</CardTitle>
                            </CardHeader>
                            <CardContent className="px-0">
                                <Table>
                                    <TableBody>
                                        {analytics && displayedAdjustments.length > 0 ? displayedAdjustments.map((adj, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs">{formatToWIB(new Date(adj.date), 'dd/MM/yy HH:mm')}</TableCell>
                                                <TableCell className="text-xs truncate">{adj.reason}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={adj.change > 0 ? 'default' : 'destructive'} className={cn(adj.change > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                                        {adj.change > 0 ? '+' : ''}{adj.change}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-10">Tidak ada penyesuaian manual.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            {analytics && analytics.manualAdjustments.length > 5 && (
                                <CardFooter className="justify-center py-2 border-t">
                                    <Button variant="link" size="sm" onClick={() => setIsHistoryDialogOpen(true)}>
                                        Lihat semua
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                        
                    </div>
                 </div>
            </main>
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Riwayat Stok Manual: {product.name}</DialogTitle>
                        <DialogDescription>
                            Menampilkan semua penyesuaian stok manual untuk produk ini.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Varian</TableHead>
                                    <TableHead>Alasan</TableHead>
                                    <TableHead className="text-right">Perubahan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics?.manualAdjustments.map((adj, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs">{formatToWIB(new Date(adj.date), 'dd/MM/yy HH:mm')}</TableCell>
                                        <TableCell className="text-xs font-medium">{adj.variantName || '-'}</TableCell>
                                        <TableCell className="text-xs">{adj.reason}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={adj.change > 0 ? 'default' : 'destructive'} className={cn(adj.change > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                                {adj.change > 0 ? '+' : ''}{adj.change}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

export default ProductAnalyticsPage;

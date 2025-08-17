
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, TrendingUp, TrendingDown, Hourglass, BarChart } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { subDays, isAfter } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, InventoryItemVariant } from "@/types";

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const ASSET_TURNOVER_DAYS = 30;
const FAST_MOVING_THRESHOLD = 50;
const SLOW_MOVING_THRESHOLD = 5;

interface RankedAsset {
    id: string;
    name: string;
    sku?: string;
    salesCount: number;
    stockValue: number;
}


function AssetReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

const ProductListTable = ({ products, title, icon: Icon }: { products: RankedAsset[], title: string, icon: React.ElementType }) => {
    const { language } = useLanguage();
    const t = translations[language].finance.assetReportPage;

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                <Icon className="h-5 w-5" />
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-0">
                <ScrollArea className="h-72">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead className="px-4 text-xs">{t.productColumn}</TableHead>
                                <TableHead className="text-center px-2 text-xs">{t.unitsSoldColumn}</TableHead>
                                <TableHead className="text-right px-4 text-xs">{t.stockValueColumn}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length > 0 ? products.map(product => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium text-xs px-4 py-2">
                                        <div className="truncate w-40">{product.name}</div>
                                    </TableCell>
                                    <TableCell className="text-center px-2 py-2 text-xs">{product.salesCount}</TableCell>
                                    <TableCell className="text-right px-4 py-2 text-xs">{formatCurrency(product.stockValue)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs">{t.noProductsInCategory}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


export default function AssetReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TAsset = t.finance.assetReportPage;
    const { items, allSales, loading } = useInventory();

    const { assetClassification, fastMovingProducts, slowMovingProducts, nonMovingProducts } = useMemo(() => {
        const turnoverDateThreshold = subDays(new Date(), ASSET_TURNOVER_DAYS);
        const salesVolumeMap = new Map<string, number>();
        
        allSales.forEach(sale => {
            if (isAfter(new Date(sale.saleDate), turnoverDateThreshold)) {
                const soldId = sale.variantId || sale.productId;
                if(soldId) {
                    salesVolumeMap.set(soldId.toString(), (salesVolumeMap.get(soldId.toString()) || 0) + sale.quantity);
                }
            }
        });

        const allRankedAssets: RankedAsset[] = [];
        items.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                let totalSalesCount = 0;
                let totalStockValue = 0;
                item.variants.forEach(variant => {
                    const salesCount = salesVolumeMap.get(variant.id.toString()) || 0;
                    const stockValue = (variant.costPrice && variant.costPrice > 0 && variant.stock && variant.stock > 0) ? variant.costPrice * variant.stock : 0;
                    totalSalesCount += salesCount;
                    totalStockValue += stockValue;
                });
                if (totalStockValue > 0) {
                     allRankedAssets.push({
                        id: item.id.toString(),
                        name: item.name,
                        sku: item.sku,
                        salesCount: totalSalesCount,
                        stockValue: totalStockValue,
                    });
                }
            } else {
                 if (item.costPrice && item.costPrice > 0 && item.stock && item.stock > 0) {
                    const stockValue = item.costPrice * item.stock;
                    const salesCount = salesVolumeMap.get(item.id.toString()) || 0;
                    allRankedAssets.push({
                        id: item.id.toString(),
                        name: item.name,
                        sku: item.sku,
                        salesCount: salesCount,
                        stockValue: stockValue,
                    });
                }
            }
        });

        const fast: RankedAsset[] = [];
        const slow: RankedAsset[] = [];
        const non: RankedAsset[] = [];

        allRankedAssets.forEach(asset => {
            if (asset.salesCount >= FAST_MOVING_THRESHOLD) {
                fast.push(asset);
            } else if (asset.salesCount < SLOW_MOVING_THRESHOLD) {
                non.push(asset);
            } else {
                slow.push(asset);
            }
        });
        
        const totalFastMovingValue = fast.reduce((sum, asset) => sum + asset.stockValue, 0);
        const totalSlowMovingValue = slow.reduce((sum, asset) => sum + asset.stockValue, 0);
        const totalNonMovingValue = non.reduce((sum, asset) => sum + asset.stockValue, 0);

        return {
            assetClassification: {
                totalFastMovingValue,
                totalSlowMovingValue,
                totalNonMovingValue,
                totalAssetValue: totalFastMovingValue + totalSlowMovingValue + totalNonMovingValue,
            },
            fastMovingProducts: fast.sort((a,b) => b.salesCount - a.salesCount).slice(0, 10),
            slowMovingProducts: slow.sort((a,b) => b.salesCount - a.salesCount).slice(0, 10),
            nonMovingProducts: non.sort((a,b) => b.stockValue - a.stockValue).slice(0, 10),
        };
    }, [items, allSales]);

    const chartData = [
        {
            name: TAsset.chartXAxisLabel,
            fast: assetClassification.totalFastMovingValue,
            slow: assetClassification.totalSlowMovingValue,
            nonMoving: assetClassification.totalNonMovingValue,
        }
    ];

    const chartConfig: ChartConfig = {
        fast: {
            label: TAsset.fastLabel,
            color: "hsl(var(--chart-2))",
            icon: TrendingUp,
        },
        slow: {
            label: TAsset.slowLabel,
            color: "hsl(var(--chart-3))",
            icon: Hourglass,
        },
        nonMoving: {
            label: TAsset.nonMovingLabel,
            color: "hsl(var(--chart-5))",
            icon: TrendingDown,
        },
    };

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-base font-bold">{t.finance.assetReport}</h1>
                    </div>
                    <AssetReportSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex flex-col flex-1 p-4 md:p-10 pb-8">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-base font-bold">{t.finance.assetReport}</h1>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{TAsset.totalAssetValue}</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(assetClassification.totalAssetValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{TAsset.fastLabel}</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(assetClassification.totalFastMovingValue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{TAsset.slowLabel}</CardTitle>
                            <Hourglass className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{formatCurrency(assetClassification.totalSlowMovingValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{TAsset.nonMovingLabel}</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">
                                {formatCurrency(assetClassification.totalNonMovingValue)}
                            </div>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle className="text-xs">{TAsset.chartTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={chartConfig} className="w-full h-full min-h-16">
                            <LineChart accessibilityLayer data={chartData} margin={{ top: 20, left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis 
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `Rp${(Number(value) / 1000000).toLocaleString()} Jt`}
                                />
                                <Tooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        formatter={(value) => formatCurrency(Number(value))}
                                        indicator="dot"
                                    />} 
                                />
                                <Legend content={({ payload }) => {
                                    return (
                                        <div className="flex gap-4 justify-center">
                                        {payload?.map((entry) => (
                                            <div key={entry.value} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                <span className="text-sm text-muted-foreground">{chartConfig[entry.value as keyof typeof chartConfig]?.label}</span>
                                            </div>
                                        ))}
                                        </div>
                                    )
                                }} />
                                <Line dataKey="fast" type="monotone" stroke="var(--color-fast)" strokeWidth={2} dot={true} />
                                <Line dataKey="slow" type="monotone" stroke="var(--color-slow)" strokeWidth={2} dot={true} />
                                <Line dataKey="nonMoving" type="monotone" stroke="var(--color-nonMoving)" strokeWidth={2} dot={true} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                    <ProductListTable products={fastMovingProducts} title={TAsset.topFastMoving} icon={TrendingUp} />
                    <ProductListTable products={slowMovingProducts} title={TAsset.topSlowMoving} icon={Hourglass} />
                    <ProductListTable products={nonMovingProducts} title={TAsset.topNonMoving} icon={TrendingDown} />
                </div>
            </main>
        </AppLayout>
    );
}

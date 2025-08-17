
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, TrendingUp, TrendingDown, Hourglass } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { subDays, isAfter } from "date-fns";

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const ASSET_TURNOVER_DAYS = 30;
const FAST_MOVING_THRESHOLD = 50;
const SLOW_MOVING_THRESHOLD = 5;


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

export default function AssetReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TAsset = t.finance.assetReportPage;
    const { items, allSales, loading } = useInventory();

    const assetClassification = useMemo(() => {
        const turnoverDateThreshold = subDays(new Date(), ASSET_TURNOVER_DAYS);

        // 1. Aggregate sales quantity per item in the last 30 days
        const salesVolumeMap = new Map<string, number>();
        allSales.forEach(sale => {
            if (isAfter(new Date(sale.saleDate), turnoverDateThreshold)) {
                const soldId = sale.variantId || sale.productId;
                if(soldId) {
                    const currentQty = salesVolumeMap.get(soldId.toString()) || 0;
                    salesVolumeMap.set(soldId.toString(), currentQty + sale.quantity);
                }
            }
        });

        // 2. Classify assets based on sales volume
        const fastMovingAssets: number[] = [];
        const slowMovingAssets: number[] = [];
        const nonMovingAssets: number[] = [];

        items.forEach(item => {
            const processAsset = (asset: { id: string, stock: number, costPrice?: number }) => {
                if (asset.costPrice && asset.costPrice > 0 && asset.stock > 0) {
                    const assetValue = asset.costPrice * asset.stock;
                    const salesCount = salesVolumeMap.get(asset.id.toString()) || 0;

                    if (salesCount >= FAST_MOVING_THRESHOLD) {
                        fastMovingAssets.push(assetValue);
                    } else if (salesCount >= SLOW_MOVING_THRESHOLD) {
                        slowMovingAssets.push(assetValue);
                    } else {
                        nonMovingAssets.push(assetValue);
                    }
                }
            };
            
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => processAsset(variant));
            } else {
                 if (item.stock && item.costPrice) {
                    processAsset({id: item.id, stock: item.stock, costPrice: item.costPrice});
                 }
            }
        });

        const totalFastMovingValue = fastMovingAssets.reduce((sum, value) => sum + value, 0);
        const totalSlowMovingValue = slowMovingAssets.reduce((sum, value) => sum + value, 0);
        const totalNonMovingValue = nonMovingAssets.reduce((sum, value) => sum + value, 0);
        
        return {
            totalFastMovingValue,
            totalSlowMovingValue,
            totalNonMovingValue,
            totalAssetValue: totalFastMovingValue + totalSlowMovingValue + totalNonMovingValue,
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


                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xs">{TAsset.chartTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                       <ChartContainer config={chartConfig} className="w-full h-full">
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
            </main>
        </AppLayout>
    );
}

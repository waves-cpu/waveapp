
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Zap, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { subDays, isAfter } from "date-fns";

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const ASSET_TURNOVER_DAYS = 30;

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
                    <Skeleton className="h-4 w-2/3 mt-2" />
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
    const { items, allSales, loading } = useInventory();

    const assetClassification = useMemo(() => {
        const fastMovingAssets: { id: string; value: number }[] = [];
        const slowMovingAssets: { id: string; value: number }[] = [];
        const turnoverDateThreshold = subDays(new Date(), ASSET_TURNOVER_DAYS);

        const soldItemIds = new Set<string>();
        allSales.forEach(sale => {
            if (isAfter(new Date(sale.saleDate), turnoverDateThreshold)) {
                const soldId = sale.variantId || sale.productId;
                if(soldId) soldItemIds.add(soldId.toString());
            }
        });

        items.forEach(item => {
            const processAsset = (asset: { id: string, stock: number, costPrice?: number }) => {
                if (asset.costPrice && asset.costPrice > 0 && asset.stock > 0) {
                    const assetValue = asset.costPrice * asset.stock;
                    const assetInfo = { id: asset.id.toString(), value: assetValue };

                    if (soldItemIds.has(asset.id.toString())) {
                        fastMovingAssets.push(assetInfo);
                    } else {
                        slowMovingAssets.push(assetInfo);
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

        const totalFastMovingValue = fastMovingAssets.reduce((sum, asset) => sum + asset.value, 0);
        const totalSlowMovingValue = slowMovingAssets.reduce((sum, asset) => sum + asset.value, 0);
        
        return {
            fastMovingAssets,
            slowMovingAssets,
            totalFastMovingValue,
            totalSlowMovingValue,
            totalAssetValue: totalFastMovingValue + totalSlowMovingValue,
        };
    }, [items, allSales]);

    const chartData = [
        {
            name: "Klasifikasi Aset",
            lancar: assetClassification.totalFastMovingValue,
            tidakLancar: assetClassification.totalSlowMovingValue,
        }
    ];

    const chartConfig: ChartConfig = {
        lancar: {
            label: "Aset Lancar",
            color: "hsl(var(--chart-2))",
            icon: TrendingUp,
        },
        tidakLancar: {
            label: "Aset Tidak Lancar",
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
                        <h1 className="text-lg font-bold">{t.finance.assetReport}</h1>
                    </div>
                    <AssetReportSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10 pb-8">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.finance.assetReport}</h1>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Nilai Aset</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(assetClassification.totalAssetValue)}</div>
                            <p className="text-xs text-muted-foreground">Nilai total dari semua stok</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Lancar</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(assetClassification.totalFastMovingValue)}</div>
                            <p className="text-xs text-muted-foreground">Terjual dalam {ASSET_TURNOVER_DAYS} hari terakhir</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Tidak Lancar</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(assetClassification.totalSlowMovingValue)}</div>
                            <p className="text-xs text-muted-foreground">Tidak terjual >{ASSET_TURNOVER_DAYS} hari</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rasio Aset Lancar</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {assetClassification.totalAssetValue > 0 
                                 ? `${Math.round((assetClassification.totalFastMovingValue / assetClassification.totalAssetValue) * 100)}%`
                                 : '0%'}
                            </div>
                            <p className="text-xs text-muted-foreground">Persentase aset yang perputarannya cepat</p>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle>Grafik Perputaran Aset</CardTitle>
                        <CardDescription>Perbandingan nilai antara aset yang perputarannya cepat (lancar) dan lambat (tidak lancar).</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={chartConfig} className="min-h-72 w-full">
                            <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis 
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
                                                <span className="text-sm text-muted-foreground">{entry.value === 'lancar' ? 'Aset Lancar' : 'Aset Tidak Lancar'}</span>
                                            </div>
                                        ))}
                                        </div>
                                    )
                                }} />
                                <Bar dataKey="lancar" fill="var(--color-lancar)" radius={4} />
                                <Bar dataKey="tidakLancar" fill="var(--color-tidakLancar)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

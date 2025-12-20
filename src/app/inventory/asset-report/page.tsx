'use client';

import React, { useMemo, useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { subDays, parseISO, isAfter } from 'date-fns';
import { Flame, TrendingUp, Anchor, Activity, DollarSign, Package } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

type ProductPerformance = {
    id: string;
    name: string;
    sku?: string;
    category: string;
    imageUrl?: string;
    totalStock: number;
    totalAssetValue: number;
    unitsSold: number;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

const BEST_SELLER_THRESHOLD = 50;

function PerformanceTable({ title, products, icon }: { title: string; products: ProductPerformance[]; icon: React.ReactNode }) {
    const totalAssetValue = useMemo(() => products.reduce((sum, p) => sum + p.totalAssetValue, 0), [products]);
    const totalUnitsSold = useMemo(() => products.reduce((sum, p) => sum + p.unitsSold, 0), [products]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    {icon}
                    <CardTitle>{title}</CardTitle>
                    <Badge variant="secondary">{products.length} Produk</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50%]">Produk</TableHead>
                            <TableHead className="text-center">Stok Saat Ini</TableHead>
                            <TableHead className="text-center">Unit Terjual (30 Hari)</TableHead>
                            <TableHead className="text-right">Nilai Aset</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length > 0 ? products.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Image src={p.imageUrl || 'https://placehold.co/40x40.png'} alt={p.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image"/>
                                        <div>
                                            <p className="font-medium text-sm">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {p.sku || 'N/A'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">{p.totalStock.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-center font-semibold">{p.unitsSold.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.totalAssetValue)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Tidak ada produk dalam kategori ini.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4">
                 <div className="flex justify-between w-full text-sm font-medium">
                     <span>Total Aset Kategori Ini:</span>
                     <span>{formatCurrency(totalAssetValue)}</span>
                 </div>
            </CardFooter>
        </Card>
    );
}


export default function AssetReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { items, allSales, loading } = useInventory();

    const productPerformanceData = useMemo(() => {
        if (loading) return null;

        const salesLast30Days = allSales.filter(sale => isAfter(parseISO(sale.saleDate), subDays(new Date(), 30)));
        
        const salesBySku = new Map<string, number>();
        salesLast30Days.forEach(sale => {
            if (sale.sku && !['Cancelled', 'Return', 'Dibatalkan'].includes(sale.status || '')) {
                salesBySku.set(sale.sku, (salesBySku.get(sale.sku) || 0) + sale.quantity);
            }
        });

        const allProducts: ProductPerformance[] = items
            .filter(item => !item.isArchived)
            .flatMap(item => {
                if (item.variants && item.variants.length > 0) {
                    return item.variants.map(variant => ({
                        id: variant.id,
                        name: `${item.name} - ${variant.name}`,
                        sku: variant.sku,
                        category: item.category,
                        imageUrl: item.imageUrl,
                        totalStock: variant.stock,
                        totalAssetValue: variant.stock * (variant.costPrice || 0),
                        unitsSold: variant.sku ? (salesBySku.get(variant.sku) || 0) : 0,
                    }));
                }
                return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    category: item.category,
                    imageUrl: item.imageUrl,
                    totalStock: item.stock || 0,
                    totalAssetValue: (item.stock || 0) * (item.costPrice || 0),
                    unitsSold: item.sku ? (salesBySku.get(item.sku) || 0) : 0,
                };
            });

        const bestSellers = allProducts.filter(p => p.unitsSold > BEST_SELLER_THRESHOLD).sort((a,b) => b.unitsSold - a.unitsSold);
        const normalMovers = allProducts.filter(p => p.unitsSold > 0 && p.unitsSold <= BEST_SELLER_THRESHOLD).sort((a,b) => b.unitsSold - a.unitsSold);
        const slowMovers = allProducts.filter(p => p.unitsSold === 0).sort((a,b) => b.totalAssetValue - a.totalAssetValue);

        return { bestSellers, normalMovers, slowMovers };

    }, [items, allSales, loading]);

    if (loading || !productPerformanceData) {
        return (
             <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                     <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Laporan Aset Produk</h1>
                    </div>
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </main>
            </AppLayout>
        )
    }

    const { bestSellers, normalMovers, slowMovers } = productPerformanceData;

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Laporan Aset Produk</h1>
                </div>

                <div className="space-y-6">
                    <PerformanceTable 
                        title="Best Seller ( >50 Terjual / 30 Hari )" 
                        products={bestSellers} 
                        icon={<Flame className="h-6 w-6 text-red-500"/>} 
                    />
                    <PerformanceTable 
                        title="Penjualan Normal ( 1-50 Terjual / 30 Hari )" 
                        products={normalMovers} 
                        icon={<TrendingUp className="h-6 w-6 text-green-500"/>}
                    />
                    <PerformanceTable 
                        title="Slow Moving ( Tidak Terjual / 30 Hari )" 
                        products={slowMovers}
                        icon={<Anchor className="h-6 w-6 text-blue-500"/>} 
                    />
                </div>
            </main>
        </AppLayout>
    );
}


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
import { Flame, TrendingUp, Anchor, Activity, DollarSign, Package, Eye } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { categories as allCategories } from '@/types';

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
const DISPLAY_LIMIT = 20;

function PerformanceTable({ title, products, icon, onViewAll }: { title: string; products: ProductPerformance[]; icon: React.ReactNode; onViewAll: () => void; }) {
    const totalAssetValue = useMemo(() => products.reduce((sum, p) => sum + p.totalAssetValue, 0), [products]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <CardTitle>{title}</CardTitle>
                    <Badge variant="secondary">{products.length} Produk</Badge>
                </div>
                 {products.length > DISPLAY_LIMIT && (
                    <Button variant="outline" size="sm" onClick={onViewAll}>
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Semua
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50%]">Produk</TableHead>
                            <TableHead className="text-center">Stok Saat Ini</TableHead>
                            <TableHead className="text-center">Unit Terjual</TableHead>
                            <TableHead className="text-right">Nilai Aset</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length > 0 ? products.slice(0, DISPLAY_LIMIT).map(p => (
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

function ViewAllDialog({
  open,
  onOpenChange,
  title,
  products,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  products: ProductPerformance[]
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Menampilkan semua {products.length} produk dalam kategori ini.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow border rounded-md">
                     <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead className="w-[50%]">Produk</TableHead>
                                <TableHead className="text-center">Stok</TableHead>
                                <TableHead className="text-center">Terjual</TableHead>
                                <TableHead className="text-right">Nilai Aset</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map(p => (
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
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


export default function AssetReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { items, allSales, loading } = useInventory();
    const [daysFilter, setDaysFilter] = useState<number>(30);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState<{title: string, products: ProductPerformance[]}>({ title: '', products: [] });

    const productPerformanceData = useMemo(() => {
        if (loading) return null;

        const dateFrom = subDays(new Date(), daysFilter);
        const salesInDateRange = allSales.filter(sale => isAfter(parseISO(sale.saleDate), dateFrom));
        
        const salesBySku = new Map<string, number>();
        salesInDateRange.forEach(sale => {
            if (sale.sku && !['Cancelled', 'Return', 'Dibatalkan'].includes(sale.status || '')) {
                salesBySku.set(sale.sku, (salesBySku.get(sale.sku) || 0) + sale.quantity);
            }
        });

        const allProducts: ProductPerformance[] = items
            .filter(item => !item.isArchived && (!categoryFilter || item.category === categoryFilter))
            .map(item => {
                let totalStock = 0;
                let totalAssetValue = 0;
                let unitsSold = 0;
                
                if (item.variants && item.variants.length > 0) {
                    totalStock = item.variants.reduce((sum, v) => sum + v.stock, 0);
                    totalAssetValue = item.variants.reduce((sum, v) => sum + v.stock * (v.costPrice || 0), 0);
                    unitsSold = item.variants.reduce((sum, v) => sum + (v.sku ? salesBySku.get(v.sku) || 0 : 0), 0);
                } else {
                    totalStock = item.stock || 0;
                    totalAssetValue = (item.stock || 0) * (item.costPrice || 0);
                    unitsSold = item.sku ? salesBySku.get(item.sku) || 0 : 0;
                }
                
                return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    category: item.category,
                    imageUrl: item.imageUrl,
                    totalStock,
                    totalAssetValue,
                    unitsSold,
                };
            });

        const threshold = BEST_SELLER_THRESHOLD * (daysFilter / 30);
        
        const bestSellers = allProducts.filter(p => p.unitsSold > threshold).sort((a,b) => b.unitsSold - a.unitsSold);
        const normalMovers = allProducts.filter(p => p.unitsSold > 0 && p.unitsSold <= threshold).sort((a,b) => b.unitsSold - a.unitsSold);
        const slowMovers = allProducts.filter(p => p.unitsSold === 0).sort((a,b) => b.totalAssetValue - a.totalAssetValue);

        return { bestSellers, normalMovers, slowMovers };

    }, [items, allSales, loading, daysFilter, categoryFilter]);

    const openDialog = (title: string, products: ProductPerformance[]) => {
        setDialogContent({ title, products });
        setIsDialogOpen(true);
    };


    if (loading || !productPerformanceData) {
        return (
             <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                     <div className="flex items-center justify-between mb-6">
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
    const bestSellerTitle = `Best Seller (> ${Math.round(BEST_SELLER_THRESHOLD * (daysFilter/30))} Terjual)`;
    const normalMoversTitle = "Penjualan Normal";
    const slowMoversTitle = "Slow Moving (Tidak Terjual)";


    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Laporan Aset Produk</h1>
                    </div>
                     <div className="flex items-center gap-2">
                         <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}>
                             <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Semua Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={daysFilter.toString()} onValueChange={(value) => setDaysFilter(Number(value))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Pilih Periode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 Hari Terakhir</SelectItem>
                                <SelectItem value="30">30 Hari Terakhir</SelectItem>
                                <SelectItem value="90">90 Hari Terakhir</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>


                <div className="space-y-6">
                    <PerformanceTable 
                        title={bestSellerTitle}
                        products={bestSellers} 
                        icon={<Flame className="h-6 w-6 text-red-500"/>} 
                        onViewAll={() => openDialog(bestSellerTitle, bestSellers)}
                    />
                    <PerformanceTable 
                        title={normalMoversTitle} 
                        products={normalMovers} 
                        icon={<TrendingUp className="h-6 w-6 text-green-500"/>}
                        onViewAll={() => openDialog(normalMoversTitle, normalMovers)}
                    />
                    <PerformanceTable 
                        title={slowMoversTitle} 
                        products={slowMovers}
                        icon={<Anchor className="h-6 w-6 text-blue-500"/>}
                        onViewAll={() => openDialog(slowMoversTitle, slowMovers)}
                    />
                </div>
            </main>
            <ViewAllDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                title={dialogContent.title}
                products={dialogContent.products}
            />
        </AppLayout>
    );
}


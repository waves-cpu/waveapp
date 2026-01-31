
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { subDays, parseISO, isAfter } from 'date-fns';
import { Flame, TrendingUp, Anchor, Activity, DollarSign, Package, Eye, Search, ChevronDown, Edit } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { categories as allCategories, type InventoryItem, type InventoryItemVariant } from '@/types';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { VariantDisplayDialog } from '@/app/components/variant-display-dialog';
import { BulkEditVariantsDialog } from '@/app/components/bulk-edit-variants-dialog';
import { cn } from '@/lib/utils';


type VariantPerformance = {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    assetValue: number;
    unitsSold: number;
}

type ProductPerformance = {
    id: string;
    name: string;
    sku?: string;
    category: string;
    imageUrl?: string;
    totalStock: number;
    totalAssetValue: number;
    unitsSold: number;
    variants: VariantPerformance[];
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
const DIALOG_ITEMS_PER_PAGE = 50;

function PerformanceTable({ title, products, icon, onViewAll }: { title: string; products: ProductPerformance[]; icon: React.ReactNode; onViewAll: () => void; }) {
    const totalAssetValue = useMemo(() => products.reduce((sum, p) => sum + p.totalAssetValue, 0), [products]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
                           <React.Fragment key={p.id}>
                                <TableRow 
                                    onClick={() => p.variants.length > 0 && toggleRow(p.id)} 
                                    className={cn(p.variants.length > 0 && "cursor-pointer", "border-b-0")}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 shrink-0">
                                                {p.variants.length > 0 && (
                                                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows.has(p.id) && "rotate-180")} />
                                                )}
                                            </div>
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
                                {expandedRows.has(p.id) && p.variants.map(v => (
                                    <TableRow key={v.id} className="bg-muted/30 hover:bg-muted/50 border-b-0">
                                        <TableCell className="pl-16 py-2">
                                            <div>
                                                <p className="font-medium text-sm">{v.name}</p>
                                                <p className="text-xs text-muted-foreground">SKU: {v.sku || 'N/A'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2">{v.stock.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-center font-semibold py-2">{v.unitsSold.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right py-2">{formatCurrency(v.assetValue)}</TableCell>
                                    </TableRow>
                                ))}
                                 <TableRow className="border-b"><TableCell colSpan={4} className="p-0"></TableCell></TableRow>
                            </React.Fragment>
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
  products: ProductPerformance[],
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            setCurrentPage(1);
            setExpandedRows(new Set());
        }
    }, [open]);
    
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

    const filteredProducts = useMemo(() => {
        setCurrentPage(1);
        if (!searchTerm) {
            return products;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowercasedTerm) ||
            (p.sku && p.sku.toLowerCase().includes(lowercasedTerm))
        );
    }, [products, searchTerm]);

    const totalPages = Math.ceil(filteredProducts.length / DIALOG_ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * DIALOG_ITEMS_PER_PAGE;
        return filteredProducts.slice(startIndex, startIndex + DIALOG_ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Menampilkan semua {products.length} produk dalam kategori ini.
                    </DialogDescription>
                </DialogHeader>

                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk atau SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

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
                            {paginatedProducts.map(p => (
                                <React.Fragment key={p.id}>
                                    <TableRow 
                                        onClick={() => p.variants.length > 0 && toggleRow(p.id)} 
                                        className={cn(p.variants.length > 0 && "cursor-pointer", "border-b-0")}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                 <div className="w-4 shrink-0">
                                                    {p.variants.length > 0 && (
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows.has(p.id) && "rotate-180")} />
                                                    )}
                                                </div>
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
                                    {expandedRows.has(p.id) && p.variants.map(v => (
                                        <TableRow key={v.id} className="bg-muted/30 hover:bg-muted/50 border-b-0">
                                            <TableCell className="pl-16 py-2">
                                                <div>
                                                    <p className="font-medium text-sm">{v.name}</p>
                                                    <p className="text-xs text-muted-foreground">SKU: {v.sku || 'N/A'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2">{v.stock.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-center font-semibold py-2">{v.unitsSold.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-right py-2">{formatCurrency(v.assetValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                     <TableRow className="border-b"><TableCell colSpan={4} className="p-0"></TableCell></TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 <DialogFooter className="pt-4">
                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                 </DialogFooter>
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
    
    const [selectedPerfItem, setSelectedPerfItem] = useState<ProductPerformance | null>(null);
    const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

    const { 
        bestSellers, 
        normalMovers, 
        slowMovers,
        bestSellersAssetValue,
        normalMoversAssetValue,
        slowMoversAssetValue,
        totalAssetValue,
    } = useMemo(() => {
        if (loading) return { 
            bestSellers: [], normalMovers: [], slowMovers: [],
            bestSellersAssetValue: 0, normalMoversAssetValue: 0, slowMoversAssetValue: 0, totalAssetValue: 0
        };

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
                let performanceVariants: VariantPerformance[] = [];
                
                if (item.variants && item.variants.length > 0) {
                    performanceVariants = item.variants.map(v => {
                        const unitsSold = v.sku ? salesBySku.get(v.sku) || 0 : 0;
                        const assetValue = v.stock * (v.costPrice || 0);
                        return {
                            id: v.id,
                            name: v.name,
                            sku: v.sku,
                            stock: v.stock,
                            assetValue: assetValue,
                            unitsSold: unitsSold,
                        };
                    });
                }
                
                const totalStock = performanceVariants.length > 0
                    ? performanceVariants.reduce((sum, v) => sum + v.stock, 0)
                    : (item.stock || 0);
                
                const totalAssetValue = performanceVariants.length > 0
                    ? performanceVariants.reduce((sum, v) => sum + v.assetValue, 0)
                    : (item.stock || 0) * (item.costPrice || 0);
                
                const unitsSold = performanceVariants.length > 0
                    ? performanceVariants.reduce((sum, v) => sum + v.unitsSold, 0)
                    : (item.sku ? salesBySku.get(item.sku) || 0 : 0);

                return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    category: item.category,
                    imageUrl: item.imageUrl,
                    totalStock,
                    totalAssetValue,
                    unitsSold,
                    variants: performanceVariants,
                };
            });

        const threshold = BEST_SELLER_THRESHOLD * (daysFilter / 30);
        
        const bestSellers = allProducts.filter(p => p.unitsSold > threshold).sort((a,b) => b.unitsSold - a.unitsSold);
        const normalMovers = allProducts.filter(p => p.unitsSold > 0 && p.unitsSold <= threshold).sort((a,b) => b.unitsSold - a.unitsSold);
        const slowMovers = allProducts.filter(p => p.unitsSold === 0).sort((a,b) => b.totalAssetValue - a.totalAssetValue);
        
        const bestSellersAssetValue = bestSellers.reduce((sum, p) => sum + p.totalAssetValue, 0);
        const normalMoversAssetValue = normalMovers.reduce((sum, p) => sum + p.totalAssetValue, 0);
        const slowMoversAssetValue = slowMovers.reduce((sum, p) => sum + p.totalAssetValue, 0);

        return { 
            bestSellers, normalMovers, slowMovers,
            bestSellersAssetValue,
            normalMoversAssetValue,
            slowMoversAssetValue,
            totalAssetValue: bestSellersAssetValue + normalMoversAssetValue + slowMoversAssetValue
        };

    }, [items, allSales, loading, daysFilter, categoryFilter]);

    const openDialog = (title: string, products: ProductPerformance[]) => {
        setDialogContent({ title, products });
        setIsDialogOpen(true);
    };

    if (loading) {
        return (
             <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                     <div className="flex items-center justify-between mb-6">
                        <h1 className="text-lg font-bold">Laporan Aset Produk</h1>
                    </div>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </main>
            </AppLayout>
        )
    }
    
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Nilai Aset</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Best Seller</CardTitle>
                            <Flame className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(bestSellersAssetValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Penjualan Normal</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(normalMoversAssetValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Tidak Terjual</CardTitle>
                            <Anchor className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(slowMoversAssetValue)}</div>
                        </CardContent>
                    </Card>
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

    

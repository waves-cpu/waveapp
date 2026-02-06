
'use client';

import React, { useMemo, useState, useDeferredValue } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { subDays, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Flame, TrendingUp, Anchor, DollarSign, Package, Eye, Search, ChevronDown, Edit, Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { categories as allCategories, type InventoryItem, type InventoryItemVariant } from '@/types';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { cn, formatToWIB } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

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
const DISPLAY_LIMIT = 10;
const DIALOG_ITEMS_PER_PAGE = 50;

function PerformanceTable({ title, description, products, icon, onViewAll }: { title: string; description: string; products: ProductPerformance[]; icon: React.ReactNode; onViewAll: () => void; }) {
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
            <CardHeader>
                <div className="flex flex-row items-center justify-between">
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
                </div>
                <CardDescription>{description}</CardDescription>
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
                                    className={cn(p.variants.length > 0 && "cursor-pointer hover:bg-muted/50")}
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
                                    <TableRow key={v.id} className="bg-muted/30 hover:bg-muted/50">
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
                            </React.Fragment>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Tidak ada produk dalam kategori ini.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            {products.length > 0 && (
                <CardFooter className="bg-muted/50 p-4">
                    <div className="flex justify-between w-full text-sm font-medium">
                        <span>Total Aset Kategori Ini:</span>
                        <span>{formatCurrency(totalAssetValue)}</span>
                    </div>
                </CardFooter>
            )}
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

    React.useEffect(() => {
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
                                        className={cn(p.variants.length > 0 && "cursor-pointer hover:bg-muted/50")}
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
                                        <TableRow key={v.id} className="bg-muted/30 hover:bg-muted/50">
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
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 <DialogFooter className="pt-4 border-t">
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

function AssetReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                     <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-5 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-full mt-2" /></CardContent>
                    </Card>
                ))}
            </div>
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-9 w-28" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="flex justify-between items-center py-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-5 w-12" />
                                    <Skeleton className="h-5 w-12" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter><Skeleton className="h-6 w-1/4" /></CardFooter>
                </Card>
            ))}
        </div>
    );
}


export default function AssetReportPage() {
    const { items, allSales, loading } = useInventory();
    const [date, setDate] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState<{title: string, products: ProductPerformance[]}>({ title: '', products: [] });

    const { 
        bestSellers, 
        normalMovers, 
        slowMovers,
        bestSellersAssetValue,
        normalMoversAssetValue,
        slowMoversAssetValue,
        totalAssetValue,
        totalStock,
    } = useMemo(() => {
        if (loading || !date?.from) return { 
            bestSellers: [], normalMovers: [], slowMovers: [],
            bestSellersAssetValue: 0, normalMoversAssetValue: 0, slowMoversAssetValue: 0, totalAssetValue: 0,
            totalStock: 0,
        };

        const toDate = date.to || date.from;
        const salesInDateRange = allSales.filter(sale => isWithinInterval(parseISO(sale.saleDate), { start: startOfDay(date.from!), end: endOfDay(toDate) }));
        
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
        
        const totalStock = allProducts.reduce((sum, p) => sum + p.totalStock, 0);

        const diffTime = Math.abs((date.to || date.from).getTime() - date.from.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const threshold = BEST_SELLER_THRESHOLD * (diffDays / 30);
        
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
            totalAssetValue: bestSellersAssetValue + normalMoversAssetValue + slowMoversAssetValue,
            totalStock,
        };

    }, [items, allSales, loading, date, categoryFilter]);


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
                    <AssetReportSkeleton />
                </main>
            </AppLayout>
        )
    }
    
    const diffDays = date?.from && date?.to ? Math.ceil(Math.abs(date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 30;
    const thresholdValue = Math.round(BEST_SELLER_THRESHOLD * (diffDays/30));
    const bestSellerDesc = `Produk yang terjual lebih dari ${thresholdValue} unit dalam ${diffDays} hari terakhir.`;
    const normalMoversDesc = `Produk dengan penjualan stabil (1 - ${thresholdValue} unit) dalam ${diffDays} hari terakhir.`;
    const slowMoversDesc = `Produk yang tidak memiliki catatan penjualan dalam ${diffDays} hari terakhir.`;
    
    const bestSellerAssetPercentage = totalAssetValue > 0 ? (bestSellersAssetValue / totalAssetValue) * 100 : 0;
    const normalMoversAssetPercentage = totalAssetValue > 0 ? (normalMoversAssetValue / totalAssetValue) * 100 : 0;
    const slowMoversAssetPercentage = totalAssetValue > 0 ? (slowMoversAssetValue / totalAssetValue) * 100 : 0;

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
                             <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Semua Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[260px] justify-start text-left font-normal h-9",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {formatToWIB(date.from, "LLL dd, y")} -{" "}
                                                {formatToWIB(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            formatToWIB(date.from, "LLL dd, y")
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
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Nilai Aset</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</div>
                            <p className="text-xs text-muted-foreground">Total nilai HPP dari semua stok produk.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Stok Produk</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(totalStock || 0).toLocaleString('id-ID')}</div>
                            <p className="text-xs text-muted-foreground">Jumlah unit dari semua produk.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Best Seller</CardTitle>
                            <Flame className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(bestSellersAssetValue)}</div>
                            <p className="text-xs text-muted-foreground">{bestSellerAssetPercentage.toFixed(1)}% dari total aset</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Penjualan Normal</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(normalMoversAssetValue)}</div>
                             <p className="text-xs text-muted-foreground">{normalMoversAssetPercentage.toFixed(1)}% dari total aset</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aset Slow Moving</CardTitle>
                            <Anchor className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(slowMoversAssetValue)}</div>
                             <p className="text-xs text-muted-foreground">{slowMoversAssetPercentage.toFixed(1)}% dari total aset</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <PerformanceTable 
                        title="Best Seller"
                        description={bestSellerDesc}
                        products={bestSellers} 
                        icon={<Flame className="h-6 w-6 text-red-500"/>} 
                        onViewAll={() => openDialog(`Best Seller`, bestSellers)}
                    />
                    <PerformanceTable 
                        title="Penjualan Normal"
                        description={normalMoversDesc}
                        products={normalMovers} 
                        icon={<TrendingUp className="h-6 w-6 text-green-500"/>}
                        onViewAll={() => openDialog(`Penjualan Normal`, normalMovers)}
                    />
                    <PerformanceTable 
                        title="Slow Moving"
                        description={slowMoversDesc}
                        products={slowMovers}
                        icon={<Anchor className="h-6 w-6 text-blue-500"/>}
                        onViewAll={() => openDialog(`Slow Moving`, slowMovers)}
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

    

    

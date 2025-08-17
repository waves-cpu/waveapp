
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Archive, Package } from "lucide-react";
import type { InventoryItem, InventoryItemVariant } from "@/types";
import Image from "next/image";
import { Store, ShoppingBag } from "lucide-react";

interface AssetItem {
    id: string;
    type: 'product' | 'variant';
    name: string;
    parentName?: string;
    parentSku?: string;
    imageUrl?: string;
    sku?: string;
    category: string;
    costPrice: number;
    stock: number;
    totalValue: number;
}

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

function AssetReportSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-10 w-10 rounded-sm" />
                                            <div>
                                                <Skeleton className="h-4 w-40" />
                                                <Skeleton className="h-3 w-24 mt-2" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

export default function AssetReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { items, loading } = useInventory();

    const assetItems = useMemo((): AssetItem[] => {
        const allAssetItems: AssetItem[] = [];
        items.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => {
                    if (variant.costPrice && variant.costPrice > 0 && variant.stock > 0) {
                        allAssetItems.push({
                            id: variant.id,
                            type: 'variant',
                            name: variant.name,
                            parentName: item.name,
                            parentSku: item.sku,
                            imageUrl: item.imageUrl,
                            sku: variant.sku,
                            category: item.category,
                            costPrice: variant.costPrice,
                            stock: variant.stock,
                            totalValue: variant.costPrice * variant.stock
                        });
                    }
                });
            } else {
                if (item.costPrice && item.costPrice > 0 && item.stock && item.stock > 0) {
                    allAssetItems.push({
                        id: item.id,
                        type: 'product',
                        name: item.name,
                        imageUrl: item.imageUrl,
                        sku: item.sku,
                        category: item.category,
                        costPrice: item.costPrice,
                        stock: item.stock,
                        totalValue: item.costPrice * item.stock
                    });
                }
            }
        });
        return allAssetItems;
    }, [items]);

    const reportSummary = useMemo(() => {
        const totalValue = assetItems.reduce((sum, item) => sum + item.totalValue, 0);
        const totalSku = assetItems.length;
        const totalStock = assetItems.reduce((sum, item) => sum + item.stock, 0);

        return { totalValue, totalSku, totalStock };
    }, [assetItems]);
    
    const groupedItems = useMemo(() => {
        const groups = new Map<string, AssetItem[]>();
        const simpleItems: AssetItem[] = [];
        
        assetItems.forEach(item => {
            if (item.type === 'variant' && item.parentName) {
                if (!groups.has(item.parentName)) {
                    groups.set(item.parentName, []);
                }
                groups.get(item.parentName)!.push(item);
            } else {
                simpleItems.push(item);
            }
        });

        return { groups: Array.from(groups.values()), simpleItems };
      }, [assetItems]);


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

                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Nilai Aset</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(reportSummary.totalValue)}</div>
                            <p className="text-xs text-muted-foreground">Nilai total dari semua stok</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total SKU Aktif</CardTitle>
                            <Archive className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{reportSummary.totalSku}</div>
                            <p className="text-xs text-muted-foreground">Jumlah SKU dengan nilai aset</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Item Fisik</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{reportSummary.totalStock.toLocaleString('id-ID')}</div>
                            <p className="text-xs text-muted-foreground">Jumlah total item di gudang</p>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle>Rincian Aset</CardTitle>
                        <CardDescription>Daftar semua produk yang memiliki nilai aset (harga modal & stok > 0).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[45%]">Produk</TableHead>
                                    <TableHead className="text-right">Harga Modal</TableHead>
                                    <TableHead className="text-right">Stok</TableHead>
                                    <TableHead className="text-right">Total Nilai</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assetItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <ShoppingBag className="h-16 w-16" />
                                                <div className="text-center">
                                                    <p className="font-semibold">Tidak Ada Aset</p>
                                                    <p className="text-sm">Tidak ada produk dengan harga modal dan stok untuk dihitung.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {groupedItems.simpleItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <Image src={item.imageUrl || 'https://placehold.co/40x40.png'} alt={item.name} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                        <div>
                                                            <div className="font-medium">{item.name}</div>
                                                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                                                <TableCell className="text-right">{item.stock}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(item.totalValue)}</TableCell>
                                            </TableRow>
                                        ))}

                                        {groupedItems.groups.map((variants) => {
                                            const parent = variants[0];
                                            return (
                                                <React.Fragment key={parent.parentName}>
                                                    <TableRow className="bg-muted/20 hover:bg-muted/40 font-semibold">
                                                         <TableCell>
                                                            <div className="flex items-center gap-4 text-primary">
                                                                <Image src={parent.imageUrl || 'https://placehold.co/40x40.png'} alt={parent.parentName!} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                <div>
                                                                    {parent.parentName}
                                                                    <div className="text-xs text-muted-foreground font-normal">SKU: {parent.parentSku}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell colSpan={3}></TableCell>
                                                    </TableRow>
                                                     {variants.map(variant => (
                                                        <TableRow key={variant.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-4 pl-10">
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                                        <Store className="h-5 w-5 text-gray-400" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium">{variant.name}</div>
                                                                        <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(variant.costPrice)}</TableCell>
                                                            <TableCell className="text-right">{variant.stock}</TableCell>
                                                            <TableCell className="text-right font-semibold">{formatCurrency(variant.totalValue)}</TableCell>
                                                        </TableRow>
                                                     ))}
                                                </React.Fragment>
                                            )
                                        })}
                                    </>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right text-base font-bold">Total Keseluruhan Aset</TableCell>
                                    <TableCell className="text-right text-base font-bold">{formatCurrency(reportSummary.totalValue)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}


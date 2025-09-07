
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Percent, Tag } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, InventoryItemVariant } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

interface DiscountedProduct {
    id: string;
    name: string;
    sku?: string;
    category: string;
    defaultPrice: number;
    discountPrice: number;
    channel: string;
}

function DiscountReportSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-40" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DiscountReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TFinance = t.finance.discountReportPage;
    const { items, accessories, categories, loading } = useInventory();
    
    const [channelFilter, setChannelFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const discountedProducts = useMemo((): DiscountedProduct[] => {
        const allDiscounted: DiscountedProduct[] = [];

        const processItem = (item: InventoryItem | InventoryItemVariant, parent?: InventoryItem) => {
            const defaultPrice = item.price;
            if (defaultPrice === undefined || defaultPrice === null) return;

            item.channelPrices?.forEach(cp => {
                if (cp.price !== undefined && cp.price !== null && cp.price < defaultPrice) {
                    allDiscounted.push({
                        id: item.id,
                        name: parent ? `${parent.name} - ${item.name}` : item.name,
                        sku: item.sku,
                        category: parent ? parent.category : (item as InventoryItem).category,
                        defaultPrice: defaultPrice,
                        discountPrice: cp.price,
                        channel: cp.channel,
                    });
                }
            });
        };

        [...items, ...accessories].forEach(item => {
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => processItem(variant, item));
            } else {
                processItem(item);
            }
        });

        return allDiscounted;
    }, [items, accessories]);

    const filteredProducts = useMemo(() => {
        return discountedProducts
            .filter(p => !channelFilter || p.channel === channelFilter)
            .filter(p => !categoryFilter || p.category === categoryFilter);
    }, [discountedProducts, channelFilter, categoryFilter]);

    const allChannels = useMemo(() => {
        return Array.from(new Set(discountedProducts.map(p => p.channel))).sort();
    }, [discountedProducts]);

    const allCategoriesWithDiscounts = useMemo(() => {
        return Array.from(new Set(discountedProducts.map(p => p.category))).sort();
    }, [discountedProducts]);

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{TFinance.title}</h1>
                    </div>
                    <DiscountReportSkeleton />
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10 pb-8">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle>{TFinance.title}</CardTitle>
                                <CardDescription>{TFinance.description}</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select onValueChange={(value) => setChannelFilter(value === 'all' ? null : value)} defaultValue="all">
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder={TFinance.channel} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{TFinance.all} {TFinance.channel}</SelectItem>
                                        {allChannels.map(channel => (
                                            <SelectItem key={channel} value={channel} className="capitalize">{channel}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder={TFinance.category} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{TFinance.all} {TFinance.category}</SelectItem>
                                        {allCategoriesWithDiscounts.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <ScrollArea className="h-[calc(100vh-22rem)]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>{TFinance.product}</TableHead>
                                            <TableHead>{TFinance.defaultPrice}</TableHead>
                                            <TableHead>{TFinance.discountPrice}</TableHead>
                                            <TableHead>{TFinance.discount}</TableHead>
                                            <TableHead>{TFinance.channel}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map(p => (
                                                <TableRow key={`${p.id}-${p.channel}`}>
                                                    <TableCell>
                                                        <div className="font-medium text-sm">{p.name}</div>
                                                        <div className="text-xs text-muted-foreground">SKU: {p.sku || '-'}</div>
                                                    </TableCell>
                                                    <TableCell>{formatCurrency(p.defaultPrice)}</TableCell>
                                                    <TableCell className="font-semibold text-destructive">{formatCurrency(p.discountPrice)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="destructive">
                                                            -{Math.round(((p.defaultPrice - p.discountPrice) / p.defaultPrice) * 100)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="capitalize">
                                                        <Badge variant="secondary">{p.channel}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center">
                                                     <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <Tag className="h-16 w-16" />
                                                        <div className="text-center">
                                                        <p className="font-semibold">{TFinance.noDiscounts}</p>
                                                        <p className="text-sm">{TFinance.noDiscountsDesc}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

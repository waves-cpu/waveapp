
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Percent, Tag, TrendingDown, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem, InventoryItemVariant } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

interface SpecialPriceProduct {
    id: string;
    name: string;
    sku?: string;
    category: string;
    defaultPrice?: number;
    specialPrice: number;
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

    const specialPriceProducts = useMemo((): SpecialPriceProduct[] => {
        const allSpecialPrices: SpecialPriceProduct[] = [];

        const processItem = (item: InventoryItem | InventoryItemVariant, parent?: InventoryItem) => {
            const defaultPrice = item.price; // Can be undefined

            item.channelPrices?.forEach(cp => {
                // A special price is any price explicitly set for a channel.
                if (cp.price !== undefined && cp.price !== null && cp.price > 0) {
                    allSpecialPrices.push({
                        id: item.id,
                        name: parent ? `${parent.name} - ${item.name}` : item.name,
                        sku: item.sku,
                        category: parent ? parent.category : (item as InventoryItem).category,
                        defaultPrice: defaultPrice,
                        specialPrice: cp.price,
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

        return allSpecialPrices;
    }, [items, accessories]);

    const filteredProducts = useMemo(() => {
        return specialPriceProducts
            .filter(p => !channelFilter || p.channel === channelFilter)
            .filter(p => !categoryFilter || p.category === categoryFilter);
    }, [specialPriceProducts, channelFilter, categoryFilter]);

    const allChannels = useMemo(() => {
        return Array.from(new Set(specialPriceProducts.map(p => p.channel))).sort();
    }, [specialPriceProducts]);

    const allCategoriesWithDiscounts = useMemo(() => {
        return Array.from(new Set(specialPriceProducts.map(p => p.category))).sort();
    }, [specialPriceProducts]);
    
    const getPriceDifferenceBadge = (defaultPrice: number | undefined, specialPrice: number) => {
        if (defaultPrice === undefined || defaultPrice === null || defaultPrice === specialPrice) {
            return <Badge variant="outline">Harga Khusus</Badge>;
        }

        const difference = ((specialPrice - defaultPrice) / defaultPrice) * 100;
        const isDiscount = difference < 0;
        const isMarkup = difference > 0;
        
        if (isDiscount) {
            return (
                <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    {Math.round(difference)}%
                </Badge>
            );
        }

        if (isMarkup) {
            return (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +{Math.round(difference)}%
                </Badge>
            );
        }

        return null;
    }

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
                                            <TableHead>Perbedaan</TableHead>
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
                                                    <TableCell>{p.defaultPrice !== undefined ? formatCurrency(p.defaultPrice) : '-'}</TableCell>
                                                    <TableCell className={cn("font-semibold", p.defaultPrice && p.specialPrice < p.defaultPrice ? "text-destructive" : "")}>
                                                        {formatCurrency(p.specialPrice)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getPriceDifferenceBadge(p.defaultPrice, p.specialPrice)}
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


'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InventoryItem } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import Image from 'next/image';

interface DiscountedParentProduct {
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    channels: string[];
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

    const discountedProducts = useMemo((): DiscountedParentProduct[] => {
        const parentProductMap = new Map<string, DiscountedParentProduct>();

        const allItems = [...items, ...accessories];

        allItems.forEach(item => {
            const processItem = (subItem: any, parent: InventoryItem) => {
                const hasSpecialPrice = subItem.channelPrices?.some((cp: any) => cp.price !== undefined && cp.price !== null && cp.price > 0);
                if (hasSpecialPrice) {
                    if (!parentProductMap.has(parent.id)) {
                        parentProductMap.set(parent.id, {
                            id: parent.id,
                            name: parent.name,
                            category: parent.category,
                            imageUrl: parent.imageUrl,
                            channels: []
                        });
                    }
                    const entry = parentProductMap.get(parent.id)!;
                    const channelsWithPrice = subItem.channelPrices
                        .filter((cp: any) => cp.price !== undefined && cp.price !== null && cp.price > 0)
                        .map((cp: any) => cp.channel);
                    
                    channelsWithPrice.forEach((channel: string) => {
                        if (!entry.channels.includes(channel)) {
                            entry.channels.push(channel);
                        }
                    });
                }
            };
            
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => processItem(variant, item));
            } else {
                processItem(item, item);
            }
        });

        return Array.from(parentProductMap.values());
    }, [items, accessories]);

    const filteredProducts = useMemo(() => {
        return discountedProducts
            .filter(p => !channelFilter || p.channels.includes(channelFilter))
            .filter(p => !categoryFilter || p.category === categoryFilter);
    }, [discountedProducts, channelFilter, categoryFilter]);

    const allChannels = useMemo(() => {
        return Array.from(new Set(discountedProducts.flatMap(p => p.channels))).sort();
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
                                            <TableHead>{TFinance.category}</TableHead>
                                            <TableHead>{TFinance.channel}</TableHead>
                                            <TableHead className="text-center">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-4">
                                                             <Image 
                                                                src={p.imageUrl || 'https://placehold.co/40x40.png'} 
                                                                alt={p.name} 
                                                                width={40} height={40} 
                                                                className="rounded-sm" 
                                                                data-ai-hint="product image"
                                                            />
                                                            <div className="font-medium text-sm">{p.name}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{p.category}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {p.channels.map(channel => (
                                                                <Badge key={channel} variant="secondary" className="capitalize">{channel}</Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href="/finance/settings">
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        <span>Lihat/Ubah Harga</span>
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center">
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

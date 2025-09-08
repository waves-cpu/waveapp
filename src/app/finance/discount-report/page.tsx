
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
import type { InventoryItem, InventoryItemVariant } from '@/types';
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

interface DiscountedItem {
    id: string;
    name: string;
    channel: string;
    category: string;
    basePrice: number;
    discountedPrice: number;
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
                    <Skeleton className="h-9 w-32" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-[100px]" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-[100px]" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-[250px]" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-[100px]" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[50px]" /></TableCell>
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
    const { items, accessories, loading } = useInventory();
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [channelFilter, setChannelFilter] = useState<string | null>(null);

    const allDiscountedItems = useMemo(() => {
        const discounted: DiscountedItem[] = [];
        const allItems = [...items, ...accessories];

        allItems.forEach(item => {
            if(item.isArchived) return;
            
            const processItem = (subItem: InventoryItem | InventoryItemVariant, parentCategory: string) => {
                 if (subItem.channelPrices && subItem.price) {
                    subItem.channelPrices.forEach(cp => {
                        if (cp.price !== undefined && cp.price !== null && cp.price > 0 && cp.price !== subItem.price) {
                            discounted.push({
                                id: subItem.id,
                                name: item.variants ? `${item.name} - ${subItem.name}` : subItem.name,
                                channel: cp.channel,
                                category: parentCategory,
                                basePrice: subItem.price!,
                                discountedPrice: cp.price,
                            });
                        }
                    });
                }
            };
            
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => processItem(variant, item.category));
            } else {
                processItem(item, item.category);
            }
        });

        return discounted;
    }, [items, accessories]);

    const filteredItems = useMemo(() => {
        return allDiscountedItems
            .filter(item => !categoryFilter || item.category === categoryFilter)
            .filter(item => !channelFilter || item.channel === channelFilter);
    }, [allDiscountedItems, categoryFilter, channelFilter]);

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
                 <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{TFinance.title}</h1>
                    </div>
                     <Link href="/finance/settings">
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" />
                            {TFinance.allPrices}
                        </Button>
                    </Link>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardDescription>{TFinance.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{TFinance.channel}</TableHead>
                                    <TableHead>{TFinance.category}</TableHead>
                                    <TableHead className="w-[40%]">{TFinance.product}</TableHead>
                                    <TableHead>{TFinance.defaultPrice}</TableHead>
                                    <TableHead>{TFinance.discountPrice}</TableHead>
                                    <TableHead>{TFinance.discount}</TableHead>
                                    <TableHead className="text-center w-[100px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length > 0 ? (
                                    filteredItems.map(item => (
                                        <TableRow key={`${item.id}-${item.channel}`}>
                                            <TableCell className="capitalize">{item.channel}</TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>Rp{item.basePrice.toLocaleString('id-ID')}</TableCell>
                                            <TableCell>Rp{item.discountedPrice.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-red-500">
                                                -{Math.round(((item.basePrice - item.discountedPrice) / item.basePrice) * 100)}%
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
                                                            <Link href={`/finance/settings?products=${item.id}`}>
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
                                        <TableCell colSpan={7} className="h-48 text-center">
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
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

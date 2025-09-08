
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Tag, ChevronDown, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from "next/navigation";

interface DiscountedParentProduct {
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    sku?: string;
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
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-md">
                         <div className="p-4 border-b">
                            <Skeleton className="h-6 w-1/4" />
                         </div>
                         <div className="p-4">
                            <Skeleton className="h-10 w-full" />
                         </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function DiscountReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TFinance = t.finance.discountReportPage;
    const { items, accessories, loading } = useInventory();
    const router = useRouter();

    const groupedProducts = useMemo(() => {
        const parentProductMap = new Map<string, DiscountedParentProduct>();
        const allItems = [...items, ...accessories];

        allItems.forEach(item => {
            if(item.isArchived) return;

            const processItem = (subItem: any, parent: InventoryItem) => {
                const hasSpecialPrice = subItem.channelPrices?.some((cp: any) => cp.price !== undefined && cp.price !== null && cp.price > 0);
                if (hasSpecialPrice) {
                    if (!parentProductMap.has(parent.id)) {
                        parentProductMap.set(parent.id, {
                            id: parent.id,
                            name: parent.name,
                            category: parent.category,
                            imageUrl: parent.imageUrl,
                            sku: parent.sku,
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

        const productsByCategory = new Map<string, DiscountedParentProduct[]>();
        parentProductMap.forEach(product => {
            if (!productsByCategory.has(product.category)) {
                productsByCategory.set(product.category, []);
            }
            productsByCategory.get(product.category)!.push(product);
        });

        return Array.from(productsByCategory.entries())
            .map(([category, products]) => ({ category, products }))
            .sort((a, b) => a.category.localeCompare(b.category));

    }, [items, accessories]);

    const handleEditCategoryPrices = (products: DiscountedParentProduct[]) => {
        const productIds = products.map(p => p.id);
        const query = new URLSearchParams({ products: productIds.join(',') });
        router.push(`/finance/settings?${query.toString()}`);
    };


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
                
                <div className="space-y-4">
                    {groupedProducts.length > 0 ? (
                        groupedProducts.map(({ category, products }) => (
                             <Collapsible key={category} defaultOpen className="border rounded-md">
                                <CollapsibleTrigger className="flex justify-between items-center p-4 w-full cursor-pointer hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                                        <h2 className="font-semibold text-base">{category}</h2>
                                        <Badge variant="secondary">{products.length} Produk</Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditCategoryPrices(products)}}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[45%]">{TFinance.product}</TableHead>
                                                    <TableHead>{TFinance.channel}</TableHead>
                                                    <TableHead className="text-center w-[100px]">Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {products.map(p => (
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
                                                                <div>
                                                                    <div className="font-medium text-sm">{p.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {p.channels.map(channel => (
                                                                    <Badge key={channel} variant="outline" className="capitalize">{channel}</Badge>
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
                                                                        <Link href={`/finance/settings?products=${p.id}`}>
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            <span>Lihat/Ubah Harga</span>
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="h-48 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Tag className="h-16 w-16" />
                                <div className="text-center">
                                <p className="font-semibold">{TFinance.noDiscounts}</p>
                                <p className="text-sm">{TFinance.noDiscountsDesc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}


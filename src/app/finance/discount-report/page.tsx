
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Tag } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";

interface DiscountedProduct {
    id: string;
    name: string;
    sku?: string;
    imageUrl?: string;
    category: string;
    channels: string[];
}

function DiscountReportSkeleton() {
    return (
        <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[...Array(4)].map((_, j) => (
                            <Skeleton key={j} className="h-48 w-full" />
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function DiscountReportPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TFinance = t.finance.discountReportPage;
    const { items, accessories, loading } = useInventory();
    
    const discountedProductsByCategory = useMemo(() => {
        const productMap = new Map<string, DiscountedProduct>();
        const allItems = [...items, ...accessories];

        allItems.forEach(item => {
            if (item.isArchived) return;

            const processItem = (subItem: InventoryItem | InventoryItemVariant, parentItem: InventoryItem) => {
                 if (subItem.channelPrices && subItem.price && subItem.price > 0) {
                    subItem.channelPrices.forEach(cp => {
                        if (cp.price !== undefined && cp.price !== null && cp.price > 0 && cp.price < subItem.price!) {
                            if (!productMap.has(parentItem.id)) {
                                productMap.set(parentItem.id, {
                                    id: parentItem.id,
                                    name: parentItem.name,
                                    sku: parentItem.sku,
                                    imageUrl: parentItem.imageUrl,
                                    category: parentItem.category,
                                    channels: []
                                });
                            }
                            const product = productMap.get(parentItem.id)!;
                            if (!product.channels.includes(cp.channel)) {
                                product.channels.push(cp.channel);
                            }
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

        const groupedByCategory = new Map<string, DiscountedProduct[]>();
        productMap.forEach(product => {
            if (!groupedByCategory.has(product.category)) {
                groupedByCategory.set(product.category, []);
            }
            groupedByCategory.get(product.category)!.push(product);
        });

        return Array.from(groupedByCategory.entries()).sort((a,b) => a[0].localeCompare(b[0]));

    }, [items, accessories]);

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
                
                <div className="space-y-6">
                {discountedProductsByCategory.length > 0 ? (
                    discountedProductsByCategory.map(([category, products]) => (
                        <Card key={category}>
                             <CardHeader>
                                <CardTitle className="text-base">{category}</CardTitle>
                                <CardDescription>{TFinance.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {products.map(product => (
                                    <div key={product.id} className="border rounded-lg overflow-hidden group relative">
                                        <Link href={`/finance/settings?products=${product.id}`}>
                                            <Image 
                                                src={product.imageUrl || 'https://placehold.co/300x300.png'} 
                                                alt={product.name} 
                                                width={300} 
                                                height={300}
                                                className="object-cover w-full aspect-square"
                                            />
                                        </Link>
                                         <div className="absolute top-2 right-2">
                                            <Link href={`/finance/settings?products=${product.id}`}>
                                                <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                         </div>
                                        <div className="p-3">
                                            <p className="font-medium text-sm truncate">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                             <div className="flex flex-wrap gap-1 mt-2">
                                                {product.channels.map(channel => (
                                                    <span key={channel} className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full capitalize">
                                                        {channel}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="h-64 flex flex-col items-center justify-center">
                             <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Tag className="h-16 w-16" />
                                <div className="text-center">
                                <p className="font-semibold">{TFinance.noDiscounts}</p>
                                <p className="text-sm">{TFinance.noDiscountsDesc}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                </div>
            </main>
        </AppLayout>
    );
}

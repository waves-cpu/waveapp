
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { InventoryItem, InventoryItemVariant, ChannelPrice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Percent, Tag } from 'lucide-react';
import Image from 'next/image';

const CHANNELS = ['pos', 'reseller', 'shopee', 'tiktok', 'lazada'];

interface DiscountedItem {
    id: string;
    name: string;
    sku?: string;
    category: string;
    defaultPrice: number;
    discountedPrice: number;
    channel: string;
    imageUrl?: string;
}

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

export default function DiscountReportPage() {
    const { items, categories, loading } = useInventory();
    const { language } = useLanguage();
    const t = translations[language];
    const TReport = t.finance.discountReportPage;

    const [categoryFilter, setCategoryFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const discountedItems = useMemo((): DiscountedItem[] => {
        const results: DiscountedItem[] = [];
        items.forEach(item => {
            if (item.isArchived) return;

            const processItem = (subItem: InventoryItem | InventoryItemVariant, parent?: InventoryItem) => {
                const defaultPrice = subItem.price;
                if (defaultPrice === undefined || defaultPrice === null) return;

                subItem.channelPrices?.forEach(cp => {
                    if (cp.price !== undefined && cp.price < defaultPrice) {
                        results.push({
                            id: `${subItem.id}-${cp.channel}`,
                            name: parent ? `${parent.name} - ${subItem.name}` : subItem.name,
                            sku: subItem.sku,
                            category: parent?.category || (subItem as InventoryItem).category,
                            defaultPrice: defaultPrice,
                            discountedPrice: cp.price,
                            channel: cp.channel,
                            imageUrl: parent?.imageUrl || (subItem as InventoryItem).imageUrl
                        });
                    }
                });
            };

            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => processItem(variant, item));
            } else {
                processItem(item);
            }
        });
        return results;
    }, [items]);

    const filteredItems = useMemo(() => {
        return discountedItems.filter(item => {
            const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
            const channelMatch = channelFilter === 'all' || item.channel === channelFilter;
            const searchMatch = !searchTerm || 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
            
            return categoryMatch && channelMatch && searchMatch;
        });
    }, [discountedItems, categoryFilter, channelFilter, searchTerm]);

    const getChannelTranslation = (channel: string) => {
        const salesTranslations = t.sales as Record<string, string>;
        return salesTranslations[channel.toLowerCase()] || channel;
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{TReport.title}</h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardDescription>{TReport.description}</CardDescription>
                        <div className="flex flex-col md:flex-row gap-2 pt-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Cari produk atau SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder={TReport.category} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{TReport.all} {TReport.category}</SelectItem>
                                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={channelFilter} onValueChange={setChannelFilter}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder={TReport.channel} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{TReport.all} {TReport.channel}</SelectItem>
                                    {CHANNELS.map(ch => <SelectItem key={ch} value={ch}>{getChannelTranslation(ch)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{TReport.product}</TableHead>
                                        <TableHead>{TReport.channel}</TableHead>
                                        <TableHead className="text-right">{TReport.defaultPrice}</TableHead>
                                        <TableHead className="text-right">{TReport.discountPrice}</TableHead>
                                        <TableHead className="text-right">{TReport.discount}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">Memuat data...</TableCell>
                                        </TableRow>
                                    ) : filteredItems.length > 0 ? (
                                        filteredItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Image src={item.imageUrl || 'https://placehold.co/40x40.png'} alt={item.name} width={32} height={32} className="rounded-sm" />
                                                        <div>
                                                            <div className="font-medium text-sm">{item.name}</div>
                                                            <div className="text-xs text-muted-foreground">SKU: {item.sku || '-'}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize">{getChannelTranslation(item.channel)}</TableCell>
                                                <TableCell className="text-right line-through text-muted-foreground">{formatCurrency(item.defaultPrice)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(item.discountedPrice)}</TableCell>
                                                <TableCell className="text-right text-destructive font-semibold">
                                                    -{Math.round(((item.defaultPrice - item.discountedPrice) / item.defaultPrice) * 100)}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Tag className="h-16 w-16" />
                                                    <p className="font-semibold">{TReport.noDiscounts}</p>
                                                    <p className="text-sm">{TReport.noDiscountsDesc}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}


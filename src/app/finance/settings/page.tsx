
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ShoppingBag, Store, Search, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { InventoryItem } from '@/types';
import { ProductSelectionDialog } from '@/app/components/product-selection-dialog';
import Image from 'next/image';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const channelPriceSchema = z.object({
    channel: z.string(),
    price: z.coerce.number().optional(),
});

const priceSettingItemSchema = z.object({
    id: z.string(),
    type: z.enum(['product', 'variant']),
    name: z.string(),
    sku: z.string().optional(),
    imageUrl: z.string().optional(),
    parentName: z.string().optional(),
    costPrice: z.coerce.number().optional(),
    price: z.coerce.number().optional(),
    channelPrices: z.array(channelPriceSchema).optional(),
});

type PriceSettingItem = z.infer<typeof priceSettingItemSchema>;

const formSchema = z.object({
  items: z.array(priceSettingItemSchema),
});

const CHANNELS = ['pos', 'reseller', 'online'];

export default function PriceSettingsPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TPrice = t.finance.priceSettingsPage;
    const { items: allInventoryItems, categories, updatePrices, loading } = useInventory();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            items: [],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const existingItemIds = useMemo(() => new Set(fields.map(field => field.id)), [fields]);

    const availableItems = useMemo(() => {
        return allInventoryItems.filter(item => {
            if (item.variants && item.variants.length > 0) {
                return item.variants.some(v => !existingItemIds.has(v.id));
            }
            return !existingItemIds.has(item.id);
        }).map(item => {
            if (item.variants) {
                return {
                    ...item,
                    variants: item.variants.filter(v => !existingItemIds.has(v.id))
                }
            }
            return item;
        });
    }, [allInventoryItems, existingItemIds]);

    const handleProductsSelected = (selectedIds: string[]) => {
        const newItems: PriceSettingItem[] = [];

        selectedIds.forEach(id => {
            if (existingItemIds.has(id)) return;
            
            for (const item of allInventoryItems) {
                const processItem = (i: InventoryItem | any, type: 'product' | 'variant', parent?: InventoryItem) => {
                    // Helper to get online price
                    const getOnlinePrice = (channelPrices?: any[]) => {
                        const onlinePrice = channelPrices?.find(p => ['shopee', 'tiktok', 'lazada'].includes(p.channel))?.price;
                        return onlinePrice;
                    }

                    newItems.push({
                        id: i.id,
                        type: type,
                        name: i.name,
                        sku: i.sku,
                        imageUrl: parent?.imageUrl || i.imageUrl,
                        parentName: parent?.name,
                        costPrice: i.costPrice,
                        price: i.price,
                        channelPrices: CHANNELS.map(channel => {
                            let price;
                            if (channel === 'online') {
                                price = getOnlinePrice(i.channelPrices);
                            } else {
                                price = i.channelPrices?.find(p => p.channel === channel)?.price;
                            }
                            return { channel, price };
                        })
                    });
                };

                if(item.id === id && (!item.variants || item.variants.length === 0)) {
                    processItem(item, 'product');
                    break;
                }
                if (item.variants) {
                    const variant = item.variants.find(v => v.id === id);
                    if (variant) {
                        processItem(variant, 'variant', item);
                        break;
                    }
                }
            }
        });
        append(newItems);
    };

    const filteredFields = useMemo(() => {
        return fields.map((field, index) => ({ field, index })).filter(({ field }) => {
            const item = allInventoryItems.find(i => i.id === field.id || i.variants?.some(v => v.id === field.id));
            const categoryMatch = !categoryFilter || (item && item.category === categoryFilter);
            
            const lowerSearchTerm = searchTerm.toLowerCase();
            const searchMatch = !lowerSearchTerm ||
                field.name.toLowerCase().includes(lowerSearchTerm) ||
                (field.sku && field.sku.toLowerCase().includes(lowerSearchTerm)) ||
                (field.parentName && field.parentName.toLowerCase().includes(lowerSearchTerm));

            return categoryMatch && searchMatch;
        });
    }, [fields, searchTerm, categoryFilter, allInventoryItems]);
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await updatePrices(values.items);
            toast({
                title: TPrice.successToast,
                description: TPrice.successToastDesc,
            });
            replace([]);
        } catch (error) {
            console.error("Failed to update prices:", error);
            toast({
                title: TPrice.errorToast,
                description: "Failed to update prices. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.priceSettings}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {TPrice.selectProduct}
                        </Button>
                    </div>
                </div>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardDescription>{TPrice.description}</CardDescription>
                                <div className="flex items-center gap-4 pt-2">
                                    <div className="relative flex-grow">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={TPrice.searchPlaceholder}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full"
                                        />
                                    </div>
                                    <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[30%]">{TPrice.product}</TableHead>
                                                <TableHead>{TPrice.costPrice}</TableHead>
                                                <TableHead>{TPrice.defaultPrice}</TableHead>
                                                <TableHead>Harga POS</TableHead>
                                                <TableHead>Harga Reseller</TableHead>
                                                <TableHead>Harga Online</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-48">
                                                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                            <ShoppingBag className="h-16 w-16" />
                                                            <div className="text-center">
                                                                <p className="font-semibold">{TPrice.noProducts}</p>
                                                                <p className="text-sm">{TPrice.selectProductsCta}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                               filteredFields.map(({ field, index }) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-4">
                                                                {field.imageUrl ? (
                                                                    <Image src={field.imageUrl} alt={field.name} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                ) : (
                                                                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted shrink-0">
                                                                        <Store className="h-5 w-5 text-gray-400" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="font-medium text-sm">{field.parentName || field.name}</span>
                                                                    {field.type === 'variant' && <div className="text-xs text-muted-foreground">{field.name}</div>}
                                                                    <div className="text-xs text-muted-foreground">SKU: {field.sku}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                             <FormField
                                                                control={form.control}
                                                                name={`items.${index}.costPrice`}
                                                                render={({ field: formField }) => (
                                                                    <FormItem><FormControl><Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} /></FormControl><FormMessage/></FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                         <TableCell>
                                                             <FormField
                                                                control={form.control}
                                                                name={`items.${index}.price`}
                                                                render={({ field: formField }) => (
                                                                    <FormItem><FormControl><Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} /></FormControl><FormMessage/></FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        {CHANNELS.map(channel => {
                                                            const channelIndex = field.channelPrices?.findIndex(cp => cp.channel === channel);
                                                            if (channelIndex === -1) return null;
                                                            
                                                            const fieldName = `items.${index}.channelPrices.${channelIndex}.price`;

                                                            return (
                                                                <TableCell key={channel}>
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={fieldName as any}
                                                                        render={({ field: formField }) => (
                                                                            <FormItem>
                                                                                <FormControl>
                                                                                    <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} />
                                                                                </FormControl>
                                                                                <FormMessage/>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                            )
                                                        })}
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            {fields.length > 0 && (
                                <CardFooter className="justify-end gap-2 pt-6">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? t.common.saving : TPrice.saveAll}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </form>
                </Form>
                 <ProductSelectionDialog
                    open={isProductSelectionOpen}
                    onOpenChange={setProductSelectionOpen}
                    onSelect={handleProductsSelected}
                    availableItems={availableItems}
                    categories={categories}
                />
            </main>
        </AppLayout>
    );
}



'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Control, useWatch } from 'react-hook-form';
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
import { Trash2, ShoppingBag, Store, Search, PlusCircle, Pencil, X } from 'lucide-react';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { ProductSelectionDialog } from '@/app/components/product-selection-dialog';
import Image from 'next/image';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


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

const CHANNELS = ['pos', 'reseller', 'shopee', 'tiktok', 'lazada'];
const ONLINE_CHANNELS = ['shopee', 'tiktok', 'lazada'];

const getOnlinePrice = (item: InventoryItem | InventoryItemVariant) => {
    return item.channelPrices?.find(p => ONLINE_CHANNELS.includes(p.channel))?.price;
}


export default function PriceSettingsPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const TPrice = t.finance.priceSettingsPage;
    const TSales = t.sales;
    const { items: allInventoryItems, categories, updatePrices, loading } = useInventory();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    // Bulk update state
    const [bulkUpdateChannel, setBulkUpdateChannel] = useState<'costPrice' | 'price' | 'pos' | 'reseller' | 'online'>('price');
    const [bulkUpdateValue, setBulkUpdateValue] = useState<string>('');
    const [selectedItemsForBulkUpdate, setSelectedItemsForBulkUpdate] = useState<Set<string>>(new Set());


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
            return item.stock !== undefined && !existingItemIds.has(item.id);
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

    const allItemsMap = useMemo(() => {
        const map = new Map<string, {item: InventoryItem | InventoryItemVariant, type: 'product' | 'variant', parent?: InventoryItem}>();
        allInventoryItems.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => {
                    map.set(variant.id, { item: variant, type: 'variant', parent: item });
                });
            } else {
                map.set(item.id, { item, type: 'product' });
            }
        });
        return map;
    }, [allInventoryItems]);

    const handleProductsSelected = (selectedIds: string[]) => {
        const newItems: PriceSettingItem[] = [];

        selectedIds.forEach(id => {
            if (existingItemIds.has(id) || !allItemsMap.has(id)) return;

            const { item, type, parent } = allItemsMap.get(id)!;
            
            const onlinePrice = getOnlinePrice(item);

            newItems.push({
                id: item.id,
                type: type,
                name: item.name,
                sku: item.sku,
                imageUrl: parent?.imageUrl || (item as InventoryItem).imageUrl,
                parentName: parent?.name,
                costPrice: item.costPrice,
                price: item.price,
                channelPrices: CHANNELS.map(ch => {
                    if (ONLINE_CHANNELS.includes(ch)) {
                        return { channel: ch, price: onlinePrice };
                    }
                    const channelPrice = item.channelPrices?.find(p => p.channel === ch);
                    return { channel: ch, price: channelPrice?.price };
                })
            });
        });
        append(newItems);
    };

    const groupedAndFilteredItems = useMemo(() => {
        const filteredFields = fields
            .map((field, index) => ({ ...field, originalIndex: index }))
            .filter(field => {
                const lowerSearchTerm = searchTerm.toLowerCase();
                const searchMatch = !lowerSearchTerm ||
                    field.name.toLowerCase().includes(lowerSearchTerm) ||
                    (field.sku && field.sku.toLowerCase().includes(lowerSearchTerm)) ||
                    (field.parentName && field.parentName.toLowerCase().includes(lowerSearchTerm));

                if (!searchMatch) return false;

                if (!categoryFilter) return true;
                
                const inventoryItemData = allItemsMap.get(field.id);
                const itemForCategory = inventoryItemData?.parent || inventoryItemData?.item;

                return (itemForCategory as InventoryItem)?.category === categoryFilter;
            });

        const groups = new Map<string, { header: PriceSettingItem & { originalIndex: number }, variants: (PriceSettingItem & { originalIndex: number })[] }>();
        const simpleItems: (PriceSettingItem & { originalIndex: number })[] = [];

        filteredFields.forEach(field => {
            if (field.type === 'variant' && field.parentName) {
                 if (!groups.has(field.parentName)) {
                    const parentInfo = allInventoryItems.find(item => item.name === field.parentName);
                    const headerItem = {
                        id: parentInfo?.id || field.parentName,
                        name: field.parentName,
                        parentName: field.parentName,
                        imageUrl: parentInfo?.imageUrl,
                        sku: parentInfo?.sku,
                        type: 'product' as 'product',
                        originalIndex: -1, // Not a real item in the form array
                        costPrice: undefined, price: undefined, channelPrices: [],
                    };
                    groups.set(field.parentName, { header: headerItem, variants: [] });
                }
                groups.get(field.parentName)!.variants.push(field);
            } else {
                simpleItems.push(field);
            }
        });
        
        return { groups: Array.from(groups.values()), simpleItems };

    }, [fields, searchTerm, categoryFilter, allInventoryItems, allItemsMap]);
    
    useEffect(() => {
        // Reset selections when filters change
        setSelectedItemsForBulkUpdate(new Set());
    }, [searchTerm, categoryFilter]);
    
    const handleBulkUpdate = () => {
        if (selectedItemsForBulkUpdate.size === 0 || bulkUpdateValue === '') return;

        const currentValues = form.getValues('items');
        const numericValue = parseFloat(bulkUpdateValue);

        const updatedItems = currentValues.map(item => {
            if (selectedItemsForBulkUpdate.has(item.id)) {
                let updatedItem = { ...item }; // Shallow copy is enough for top-level properties

                if (bulkUpdateChannel === 'costPrice') {
                    updatedItem.costPrice = numericValue;
                } else if (bulkUpdateChannel === 'price') {
                    updatedItem.price = numericValue;
                } else {
                    // For channel prices, we need to create a new array to ensure change detection
                    let newChannelPrices = [...(item.channelPrices || CHANNELS.map(ch => ({ channel: ch, price: undefined })))];

                    if (bulkUpdateChannel === 'online') {
                        newChannelPrices = newChannelPrices.map(cp => 
                            ONLINE_CHANNELS.includes(cp.channel) ? { ...cp, price: numericValue } : cp
                        );
                    } else { // 'pos' or 'reseller'
                        const channelIndex = newChannelPrices.findIndex(cp => cp.channel === bulkUpdateChannel);
                        if (channelIndex > -1) {
                            newChannelPrices[channelIndex] = { ...newChannelPrices[channelIndex], price: numericValue };
                        } else {
                            newChannelPrices.push({ channel: bulkUpdateChannel, price: numericValue });
                        }
                    }
                    updatedItem.channelPrices = newChannelPrices;
                }
                return updatedItem;
            }
            return item;
        });

        replace(updatedItems);
        toast({ title: "Update Massal Diterapkan", description: `Harga untuk ${selectedItemsForBulkUpdate.size} item telah diperbarui di formulir.` });
    };


    const toggleAllForBulkUpdate = (checked: boolean) => {
        const allVisibleIds = new Set([
            ...groupedAndFilteredItems.simpleItems.map(i => i.id),
            ...groupedAndFilteredItems.groups.flatMap(g => g.variants.map(v => v.id))
        ]);
        if(checked) {
            setSelectedItemsForBulkUpdate(allVisibleIds);
        } else {
            setSelectedItemsForBulkUpdate(new Set());
        }
    }
    
    const toggleItemForBulkUpdate = (id: string) => {
        const newSet = new Set(selectedItemsForBulkUpdate);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedItemsForBulkUpdate(newSet);
    }
    
    const isAllVisibleSelected = useMemo(() => {
         const allVisibleIds = new Set([
            ...groupedAndFilteredItems.simpleItems.map(i => i.id),
            ...groupedAndFilteredItems.groups.flatMap(g => g.variants.map(v => v.id))
        ]);
        if (allVisibleIds.size === 0) return false;
        return Array.from(allVisibleIds).every(id => selectedItemsForBulkUpdate.has(id));
    }, [groupedAndFilteredItems, selectedItemsForBulkUpdate]);


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await updatePrices(values.items);
            toast({
                title: TPrice.successToast,
                description: TPrice.successToastDesc,
            });
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
                </div>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <Card>
                            <CardHeader>
                                <CardDescription>{TPrice.description}</CardDescription>
                                <div className="flex flex-col gap-4 pt-2">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="relative flex-grow w-full">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={TPrice.searchPlaceholder}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10 w-full"
                                            />
                                        </div>
                                        <Button type="button" onClick={() => setProductSelectionOpen(true)} className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            {TPrice.selectProduct}
                                        </Button>
                                        <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                                            <SelectTrigger className="w-full sm:w-[200px]">
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
                                    <div className="p-2 border-t border-dashed flex flex-col md:flex-row items-center gap-2">
                                        <p className="text-sm font-medium mr-2 whitespace-nowrap">Ubah Masal:</p>
                                        <Select value={bulkUpdateChannel} onValueChange={(v) => setBulkUpdateChannel(v as any)}>
                                            <SelectTrigger className="w-full md:w-[160px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="costPrice">{TPrice.costPrice}</SelectItem>
                                                <SelectItem value="price">{TPrice.defaultPrice}</SelectItem>
                                                <SelectItem value="pos">{TSales.pos}</SelectItem>
                                                <SelectItem value="reseller">{TSales.reseller}</SelectItem>
                                                <SelectItem value="online">{TPrice.onlinePrice}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            placeholder="Masukkan harga"
                                            value={bulkUpdateValue}
                                            onChange={(e) => setBulkUpdateValue(e.target.value)}
                                            className="w-full md:w-[160px]"
                                        />
                                        <Button type="button" variant="outline" onClick={handleBulkUpdate} disabled={selectedItemsForBulkUpdate.size === 0 || !bulkUpdateValue}>
                                            Terapkan ke {selectedItemsForBulkUpdate.size} item
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox
                                                        checked={isAllVisibleSelected}
                                                        onCheckedChange={toggleAllForBulkUpdate}
                                                    />
                                                </TableHead>
                                                <TableHead className="w-[35%]">{TPrice.product}</TableHead>
                                                <TableHead className="text-center">{TPrice.costPrice}</TableHead>
                                                <TableHead className="text-center">{TPrice.defaultPrice}</TableHead>
                                                <TableHead className="text-center">{TSales.pos}</TableHead>
                                                <TableHead className="text-center">{TSales.reseller}</TableHead>
                                                <TableHead className="text-center">{TPrice.onlinePrice}</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                 <TableRow>
                                                    <TableCell colSpan={8} className="text-center h-24">Memuat...</TableCell>
                                                 </TableRow>
                                            ) : fields.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center h-48">
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
                                                <>
                                                    {groupedAndFilteredItems.simpleItems.map((field) => (
                                                        <TableRow key={field.id}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={selectedItemsForBulkUpdate.has(field.id)}
                                                                    onCheckedChange={() => toggleItemForBulkUpdate(field.id)}
                                                                />
                                                            </TableCell>
                                                             <TableCell>
                                                                <div className="flex items-center gap-4">
                                                                    <Image src={field.imageUrl || 'https://placehold.co/40x40.png'} alt={field.name} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                    <div>
                                                                        <span className="font-medium text-sm">{field.name}</span>
                                                                        <div className="text-xs text-muted-foreground">SKU: {field.sku}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <PriceRowFields 
                                                                control={form.control}
                                                                index={field.originalIndex}
                                                                onRemove={() => remove(field.originalIndex)}
                                                            />
                                                        </TableRow>
                                                    ))}
                                                     {groupedAndFilteredItems.groups.map(({ header, variants }) => (
                                                        <React.Fragment key={header.id}>
                                                            <TableRow className="bg-muted/20 hover:bg-muted/40">
                                                                 <TableCell>
                                                                    <Checkbox
                                                                        checked={variants.every(v => selectedItemsForBulkUpdate.has(v.id))}
                                                                        onCheckedChange={(checked) => {
                                                                            const newSet = new Set(selectedItemsForBulkUpdate);
                                                                            if (checked) {
                                                                                variants.forEach(v => newSet.add(v.id));
                                                                            } else {
                                                                                variants.forEach(v => newSet.delete(v.id));
                                                                            }
                                                                            setSelectedItemsForBulkUpdate(newSet);
                                                                        }}
                                                                    />
                                                                 </TableCell>
                                                                <TableCell className="font-semibold text-primary">
                                                                    <div className="flex items-center gap-4">
                                                                        <Image src={header.imageUrl || 'https://placehold.co/40x40.png'} alt={header.name} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                        <div>
                                                                            <span className="text-sm">{header.name}</span>
                                                                            <div className="text-xs text-muted-foreground font-normal">SKU: {header.sku}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell colSpan={6} />
                                                            </TableRow>
                                                            {variants.map((field) => (
                                                                <TableRow key={field.id} className="hover:bg-muted/50">
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={selectedItemsForBulkUpdate.has(field.id)}
                                                                            onCheckedChange={() => toggleItemForBulkUpdate(field.id)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-4 pl-4">
                                                                            <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                                                <Store className="h-5 w-5 text-gray-400" />
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-medium text-sm">{field.name}</div>
                                                                                <div className="text-xs text-muted-foreground">SKU: {field.sku}</div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <PriceRowFields 
                                                                        control={form.control}
                                                                        index={field.originalIndex}
                                                                        onRemove={() => remove(field.originalIndex)}
                                                                    />
                                                                </TableRow>
                                                            ))}
                                                        </React.Fragment>
                                                     ))}
                                                </>
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

const PriceRowFields = ({ control, index, onRemove }: { control: Control<z.infer<typeof formSchema>>, index: number, onRemove: () => void }) => {
    const { language } = useLanguage();
    const TPrice = translations[language].finance.priceSettingsPage;
    
    const channelPrices = useWatch({
        control,
        name: `items.${index}.channelPrices`,
    });

    const getChannelPriceComponent = (channel: string) => {
        // Ensure channelPrices is an array before finding index
        const cPrices = Array.isArray(channelPrices) ? channelPrices : [];
        const channelIndex = cPrices.findIndex(p => p.channel === channel);

        // For online channels, they all share one input, so we point to the first one (e.g., shopee)
        const effectiveChannelIndex = ONLINE_CHANNELS.includes(channel) 
            ? cPrices.findIndex(p => p.channel === ONLINE_CHANNELS[0])
            : channelIndex;
        
        if (effectiveChannelIndex === -1) {
             return <TableCell key={channel}></TableCell>;
        }

        const priceFieldName = `items.${index}.channelPrices.${effectiveChannelIndex}.price`;

        return (
            <TableCell key={channel}>
                <FormField
                    control={control}
                    name={priceFieldName as any}
                    render={({ field: formField }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 w-24 text-center" />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />
            </TableCell>
        );
    };

    return (
        <>
            <TableCell>
                <FormField
                    control={control}
                    name={`items.${index}.costPrice`}
                    render={({ field: formField }) => (
                        <FormItem><FormControl><Input type="number" placeholder={TPrice.costPrice} {...formField} value={formField.value ?? ''} className="h-8 w-24 text-center" /></FormControl><FormMessage/></FormItem>
                    )}
                />
            </TableCell>
            <TableCell>
                <FormField
                    control={control}
                    name={`items.${index}.price`}
                    render={({ field: formField }) => (
                        <FormItem><FormControl><Input type="number" placeholder={TPrice.defaultPrice} {...formField} value={formField.value ?? ''} className="h-8 w-24 text-center" /></FormControl><FormMessage/></FormItem>
                    )}
                />
            </TableCell>
            {getChannelPriceComponent('pos')}
            {getChannelPriceComponent('reseller')}
            {getChannelPriceComponent('shopee')}
            <TableCell className="p-1.5">
                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </>
    )
}


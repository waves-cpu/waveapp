
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
  masterPrices: z.record(z.object({
      costPrice: z.coerce.number().optional(),
      price: z.coerce.number().optional(),
      pos: z.coerce.number().optional(),
      reseller: z.coerce.number().optional(),
      online: z.coerce.number().optional(),
  })).optional()
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
    const [bulkEditStates, setBulkEditStates] = useState<Record<string, boolean>>({});

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            items: [],
            masterPrices: {}
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

    const handleProductsSelected = (selectedIds: string[]) => {
        const newItems: PriceSettingItem[] = [];

        selectedIds.forEach(id => {
            if (existingItemIds.has(id)) return;
            
            for (const item of allInventoryItems) {
                const processItem = (i: InventoryItem | InventoryItemVariant, type: 'product' | 'variant', parent?: InventoryItem) => {
                    const getOnlinePrice = (channelPrices?: any[]) => {
                        const onlinePrice = channelPrices?.find(p => ['shopee', 'tiktok', 'lazada'].includes(p.channel))?.price;
                        return onlinePrice;
                    }

                    newItems.push({
                        id: i.id,
                        type: type,
                        name: i.name,
                        sku: i.sku,
                        imageUrl: parent?.imageUrl || (i as InventoryItem).imageUrl,
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
                    return;
                }
                if (item.variants) {
                    const variant = item.variants.find(v => v.id === id);
                    if (variant) {
                        processItem(variant, 'variant', item);
                        return;
                    }
                }
            }
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
                
                 const inventoryItem = allInventoryItems.find(item => {
                    if (item.id === field.id || (item.variants && item.variants.some(v => v.id === field.id))) {
                        return true;
                    }
                    return false;
                });
                return inventoryItem?.category === categoryFilter;
            });
        
        const groups = new Map<string, (PriceSettingItem & { originalIndex: number })[]>();
        const simpleItems: (PriceSettingItem & { originalIndex: number })[] = [];

        filteredFields.forEach(field => {
            if (field.type === 'variant' && field.parentName) {
                if (!groups.has(field.parentName)) {
                    groups.set(field.parentName, []);
                }
                groups.get(field.parentName)!.push(field);
            } else {
                simpleItems.push(field);
            }
        });

        const activeGroups = new Map<string, { header: PriceSettingItem & { originalIndex: number }, variants: (PriceSettingItem & { originalIndex: number })[] }>();
        for (const [key, value] of groups.entries()) {
            if (value.length > 0) {
                const parentInfo = allInventoryItems.find(item => item.name === key);
                const headerItem = {
                    id: parentInfo?.id || key,
                    name: key,
                    parentName: key,
                    imageUrl: parentInfo?.imageUrl,
                    sku: parentInfo?.sku,
                    type: 'product' as 'product',
                    originalIndex: -1,
                };
                activeGroups.set(key, { header: headerItem, variants: value });
            }
        }
        
        return { groups: Array.from(activeGroups.values()), simpleItems };

    }, [fields, searchTerm, categoryFilter, allInventoryItems]);
    
    const applyAllMasterPrices = (parentName: string) => {
        const masterPrices = form.getValues(`masterPrices.${parentName}`);
        if (!masterPrices) return;

        const priceTypes = ['costPrice', 'price', 'pos', 'reseller', 'online'];

        fields.forEach((field, index) => {
            if (field.parentName === parentName) {
                priceTypes.forEach(priceType => {
                    const masterValue = (masterPrices as any)[priceType];
                    if (masterValue !== undefined && masterValue !== null && masterValue !== '') {
                         if (priceType === 'costPrice' || priceType === 'price') {
                            form.setValue(`items.${index}.${priceType}`, masterValue, { shouldDirty: true });
                        } else {
                            const channelIndex = form.getValues(`items.${index}.channelPrices`)?.findIndex(cp => cp.channel === priceType);
                             if (channelIndex !== -1 && channelIndex !== undefined) {
                                form.setValue(`items.${index}.channelPrices.${channelIndex}.price`, masterValue, { shouldDirty: true });
                            }
                        }
                    }
                });
            }
        });
        form.trigger('items');
        toast({ title: "Harga Diterapkan", description: `Semua harga untuk varian ${parentName} telah diatur.` });
    };

    const toggleBulkEdit = (parentName: string, state?: boolean) => {
        setBulkEditStates(prev => ({ ...prev, [parentName]: state ?? !prev[parentName] }));
    };
    
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
                                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                                     <div className="relative flex-grow w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={TPrice.searchPlaceholder}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full"
                                        />
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <Button type="button" onClick={() => setProductSelectionOpen(true)} className="w-full">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            {TPrice.selectProduct}
                                        </Button>
                                    </div>
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
                                                <TableHead>{TPrice.onlinePrice}</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                 <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24">Memuat...</TableCell>
                                                 </TableRow>
                                            ) : fields.length === 0 ? (
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
                                                <>
                                                    {groupedAndFilteredItems.simpleItems.map((field) => (
                                                        <TableRow key={field.id}>
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
                                                                form={form}
                                                                index={field.originalIndex}
                                                                onRemove={() => remove(field.originalIndex)}
                                                            />
                                                        </TableRow>
                                                    ))}
                                                     {groupedAndFilteredItems.groups.map(({ header, variants }) => (
                                                        <React.Fragment key={header.id}>
                                                            <TableRow className="bg-muted/20 hover:bg-muted/40">
                                                                <TableCell>
                                                                    <div className="flex items-center gap-4 font-semibold text-primary">
                                                                        <Image src={header.imageUrl || 'https://placehold.co/40x40.png'} alt={header.name} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                        <div>
                                                                            <span className="text-sm">{header.name}</span>
                                                                            <div className="text-xs text-muted-foreground font-normal">SKU: {header.sku}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                
                                                                {bulkEditStates[header.name] ? (
                                                                    <>
                                                                        <MasterPriceCell form={form} parentName={header.name} priceType="costPrice" t={t} />
                                                                        <MasterPriceCell form={form} parentName={header.name} priceType="price" t={t} />
                                                                        <MasterPriceCell form={form} parentName={header.name} priceType="pos" t={t} />
                                                                        <MasterPriceCell form={form} parentName={header.name} priceType="reseller" t={t} />
                                                                        <MasterPriceCell form={form} parentName={header.name} priceType="online" t={t} />
                                                                        <TableCell className="p-1.5 align-middle">
                                                                            <div className="flex items-center gap-1">
                                                                                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => applyAllMasterPrices(header.name)}>
                                                                                    {t.common.apply}
                                                                                </Button>
                                                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBulkEdit(header.name, false)}>
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    </>
                                                                ) : (
                                                                    <TableCell colSpan={6} className="text-center p-1.5">
                                                                        <Button type="button" variant="secondary" size="sm" className="h-8 px-3" onClick={() => toggleBulkEdit(header.name, true)}>
                                                                            <Pencil className="mr-2 h-3 w-3" />
                                                                            Ubah Massal
                                                                        </Button>
                                                                    </TableCell>
                                                                )}

                                                            </TableRow>
                                                            {variants.map((field) => (
                                                                <TableRow key={field.id} className="hover:bg-muted/50">
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
                                                                        form={form}
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

const PriceRowFields = ({ form, index, onRemove }: { form: any, index: number, onRemove: () => void }) => {
    return (
        <>
            <TableCell>
                <FormField
                    control={form.control}
                    name={`items.${index}.costPrice`}
                    render={({ field: formField }) => (
                        <FormItem><FormControl><Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 w-24" /></FormControl><FormMessage/></FormItem>
                    )}
                />
            </TableCell>
            <TableCell>
                <FormField
                    control={form.control}
                    name={`items.${index}.price`}
                    render={({ field: formField }) => (
                        <FormItem><FormControl><Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 w-24" /></FormControl><FormMessage/></FormItem>
                    )}
                />
            </TableCell>
            {CHANNELS.map(channel => {
                const fieldName = `items.${index}.channelPrices`;
                const currentChannelPrices = form.getValues(fieldName);
                const channelIndex = currentChannelPrices?.findIndex((cp: any) => cp.channel === channel);

                if (channelIndex === -1 || channelIndex === undefined) {
                    return <TableCell key={channel}></TableCell>;
                }
                
                const priceFieldName = `${fieldName}.${channelIndex}.price`;

                return (
                    <TableCell key={channel}>
                        <FormField
                            control={form.control}
                            name={priceFieldName}
                            render={({ field: formField }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 w-24" />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                    </TableCell>
                )
            })}
            <TableCell className="p-1.5">
                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </>
    )
}


const MasterPriceCell = ({ form, parentName, priceType, t }: {
    form: any,
    parentName: string,
    priceType: 'costPrice' | 'price' | 'pos' | 'reseller' | 'online',
    t: any
}) => {
    const TPrice = t.finance.priceSettingsPage;

    const getPlaceholder = () => {
        switch(priceType) {
            case 'costPrice': return TPrice.costPrice;
            case 'price': return TPrice.defaultPrice;
            case 'pos': return t.sales.pos;
            case 'reseller': return t.sales.reseller;
            case 'online': return TPrice.onlinePrice;
            default: return 'Harga';
        }
    }

    return (
        <TableCell className="p-1.5 align-middle">
             <FormField
                control={form.control}
                name={`masterPrices.${parentName}.${priceType}`}
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input
                                type="number"
                                placeholder={getPlaceholder()}
                                {...field}
                                value={field.value ?? ''}
                                className="h-8 w-24"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.preventDefault();
                                }}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
        </TableCell>
    )
}

    
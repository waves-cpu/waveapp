
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventory } from '@/hooks/use-inventory';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Store, ShoppingBag, Save, Loader2, PlusCircle, Settings, Edit, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductSelectionDialog } from './product-selection-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const itemPriceSchema = z.object({
    id: z.string(),
    type: z.enum(['product', 'variant']),
    costPrice: z.coerce.number().optional(),
    price: z.coerce.number().optional(),
    channelPrices: z.array(z.object({
        channel: z.string(),
        price: z.coerce.number().optional(),
    })).optional(),
});

const formSchema = z.object({
    items: z.array(itemPriceSchema),
    masterCostPrice: z.coerce.number().optional(),
    masterPrice: z.coerce.number().optional(),
    masterPosPrice: z.coerce.number().optional(),
    masterResellerPrice: z.coerce.number().optional(),
    masterOnlinePrice: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SelectedItem {
    id: string;
    name: string;
    parentName: string | null;
    sku?: string;
    type: 'product' | 'variant';
    category: string;
    imageUrl?: string;
    costPrice?: number;
    price?: number;
    channelPrices?: { channel: string; price?: number }[];
}

export function PriceSettingsForm() {
  const { items, categories, loading, updatePrices } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  const TPrice = t.finance.priceSettingsPage;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], masterCostPrice: undefined, masterPrice: undefined },
  });
  
  const { fields, replace, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const availableItemsForSelection = useMemo(() => {
    if (!categoryFilter) return [];
    return items.filter(item => 
        !item.isArchived && item.category === categoryFilter
    );
  }, [items, categoryFilter]);
  
  const flattenedFilteredItemsById = useMemo(() => {
    const map = new Map<string, SelectedItem>();
    availableItemsForSelection.forEach(item => {
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(variant => {
                map.set(variant.id, {
                    id: variant.id,
                    name: variant.name,
                    parentName: item.name,
                    sku: variant.sku,
                    type: 'variant',
                    category: item.category,
                    imageUrl: item.imageUrl,
                    costPrice: variant.costPrice,
                    price: variant.price,
                    channelPrices: variant.channelPrices || [],
                });
            });
        } else {
             map.set(item.id, {
                id: item.id,
                name: item.name,
                parentName: null,
                sku: item.sku,
                type: 'product',
                category: item.category,
                imageUrl: item.imageUrl,
                costPrice: item.costPrice,
                price: item.price,
                channelPrices: item.channelPrices || [],
            });
        }
    });
    return map;
  }, [availableItemsForSelection]);

  const handleProductsSelected = (selectedIds: string[]) => {
    const newlySelected = selectedIds
        .map(id => flattenedFilteredItemsById.get(id))
        .filter((item): item is SelectedItem => !!item);
    
    setSelectedItems(newlySelected);

    const formItems = newlySelected.map(item => ({
        id: item.id,
        type: item.type,
        costPrice: item.costPrice ?? undefined,
        price: item.price ?? undefined,
        channelPrices: [
            { channel: 'pos', price: item.channelPrices?.find(p => p.channel === 'pos')?.price ?? undefined },
            { channel: 'reseller', price: item.channelPrices?.find(p => p.channel === 'reseller')?.price ?? undefined },
            { channel: 'online', price: item.channelPrices?.find(p => ['shopee','tiktok','lazada'].includes(p.channel))?.price ?? undefined },
        ]
    }));
    replace(formItems);
    setRowSelection({});
  };
  
  const applyMasterPrice = (field: keyof FormValues, targetField: string, channel?: string) => {
    const masterValue = form.getValues(field);
    if (masterValue !== undefined && masterValue >= 0) {
      const selectedIndices = Object.keys(rowSelection).filter(key => rowSelection[key]).map(Number);
      const indicesToUpdate = selectedIndices.length > 0 ? selectedIndices : fields.map((_, index) => index);
      
      indicesToUpdate.forEach(index => {
        if (channel) {
            const channelIndex = fields[index].channelPrices?.findIndex(p => p.channel === channel);
            if(channelIndex !== -1 && fields[index].channelPrices) {
                const newChannelPrices = [...fields[index].channelPrices!];
                newChannelPrices[channelIndex] = {...newChannelPrices[channelIndex], price: masterValue};
                update(index, { ...fields[index], channelPrices: newChannelPrices });
            }
        } else {
             if (targetField === 'costPrice' || targetField === 'price') {
                 update(index, { ...fields[index], [targetField]: masterValue });
            }
        }
      });
      toast({ title: "Harga Diterapkan", description: `Harga telah diterapkan ke ${indicesToUpdate.length} produk.` });
      form.trigger(); // Manually trigger validation display
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
        fields.forEach((_, index) => {
            newSelection[index] = true;
        });
    }
    setRowSelection(newSelection);
  };
  
  const isAllSelected = fields.length > 0 && Object.keys(rowSelection).length === fields.length && Object.values(rowSelection).every(Boolean);
  const isSomeSelected = Object.values(rowSelection).some(Boolean) && !isAllSelected;

  const onSubmit = async (data: FormValues) => {
    if (!form.formState.isDirty) {
        toast({ title: TPrice.noChanges, variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    const updates = data.items.map((formItem, index) => ({
        ...formItem,
        id: selectedItems[index].id,
        type: selectedItems[index].type,
    }));

    if (updates.length === 0) {
        toast({ title: TPrice.noChanges, description: "Pilih produk terlebih dahulu." });
        setIsSubmitting(false);
        return;
    }

    try {
        await updatePrices(updates);
        toast({ title: TPrice.successTitle, description: TPrice.successDesc });
        // Reset the form state to clear selections and table
        setSelectedItems([]);
        replace([]);
        form.reset({}, { keepValues: false });
    } catch (error) {
        toast({ variant: 'destructive', title: TPrice.errorTitle, description: TPrice.errorDesc });
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedItemIds = useMemo(() => new Set(selectedItems.map(item => item.id)), [selectedItems]);

  return (
    <>
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {selectedItems.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg text-center">
                    <Settings className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{TPrice.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{TPrice.description}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <Select onValueChange={setCategoryFilter} value={categoryFilter || ''}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Pilih Kategori (Wajib)" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" onClick={() => setProductSelectionOpen(true)} disabled={!categoryFilter}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Pilih Produk untuk Diedit
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                <div className="flex justify-between items-center">
                    <Button type="button" variant="outline" onClick={() => setProductSelectionOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Ubah Pilihan Produk ({selectedItems.length})
                    </Button>
                     <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {TPrice.saveButton}
                    </Button>
                </div>

                <Card>
                    <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {(['masterCostPrice', 'masterPrice', 'masterPosPrice', 'masterResellerPrice', 'masterOnlinePrice'] as const).map(field => {
                            const priceType = field.replace('master', '').replace('Price','').toLowerCase();
                            let targetField: string, channel: string | undefined;

                            if (priceType === 'cost') targetField = 'costPrice';
                            else if (priceType === '') targetField = 'price';
                            else {
                                targetField = 'channelPrices';
                                channel = priceType;
                            }
                            
                            const labelMap = { cost: TPrice.costPrice, '': TPrice.sellingPrice, pos: TPrice.posPrice, reseller: TPrice.resellerPrice, online: TPrice.onlinePrice };
                            
                            return (
                                <FormField
                                    key={field}
                                    control={form.control}
                                    name={field}
                                    render={({ field: formField }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-xs">{labelMap[priceType as keyof typeof labelMap]}</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <FormControl>
                                                    <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 text-xs"/>
                                                </FormControl>
                                                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => applyMasterPrice(field, targetField, channel)}>
                                                    Terapkan
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            );
                        })}
                    </CardContent>
                </Card>

                <div className="border rounded-lg shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead className="w-12 px-4">
                                     <Checkbox
                                        checked={isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                     />
                                </TableHead>
                                <TableHead className="w-[30%]">{t.inventoryTable.name}</TableHead>
                                <TableHead className="w-[14%]">{TPrice.costPrice}</TableHead>
                                <TableHead className="w-[14%]">{TPrice.sellingPrice}</TableHead>
                                <TableHead className="w-[14%]">{TPrice.posPrice}</TableHead>
                                <TableHead className="w-[14%]">{TPrice.resellerPrice}</TableHead>
                                <TableHead className="w-[14%]">{TPrice.onlinePrice}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {fields.map((field, index) => {
                                const originalItem = selectedItems[index];
                                if (!originalItem) return null;

                                 return (
                                    <TableRow 
                                        key={field.id} 
                                        className={cn(originalItem.parentName ? "bg-background" : "bg-muted/30")}
                                        data-state={rowSelection[index] ? 'selected' : ''}
                                    >
                                        <TableCell className="px-4">
                                            <Checkbox
                                                checked={rowSelection[index] || false}
                                                onCheckedChange={(checked) => {
                                                    setRowSelection(prev => ({...prev, [index]: !!checked}))
                                                }}
                                                aria-label={`Select ${originalItem.name}`}
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <div className="flex items-center gap-3">
                                                {originalItem.imageUrl ? (
                                                    <Image 
                                                        src={originalItem.imageUrl} 
                                                        alt={originalItem.name} 
                                                        width={32} 
                                                        height={32} 
                                                        className="rounded-sm shrink-0"
                                                        data-ai-hint="product image"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-sm shrink-0 bg-muted/50">
                                                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-sm max-w-[250px] truncate">{originalItem.parentName ? originalItem.parentName : originalItem.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {originalItem.parentName ? originalItem.name : `SKU: ${originalItem.sku || 'N/A'}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {(['costPrice', 'price'] as const).map(priceType => (
                                            <TableCell key={priceType}>
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.${priceType}`}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 text-xs"/>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                        ))}
                                        {(['pos', 'reseller', 'online'] as const).map((channel, cIndex) => (
                                             <TableCell key={channel}>
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.channelPrices.${cIndex}.price`}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...formField} value={formField.value ?? ''} className="h-8 text-xs"/>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                </>
            )}
        </form>
    </Form>
    <ProductSelectionDialog
        open={isProductSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        onSelect={handleProductsSelected}
        availableItems={availableItemsForSelection}
        categories={categories}
        initialSelectedIds={selectedItemIds}
        title="Pilih Produk"
        description="Pilih produk yang harganya ingin Anda atur."
    />
    </>
  );
}

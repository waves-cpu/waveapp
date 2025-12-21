
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
} from '@/components/ui/form';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Store, ShoppingBag, Save, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { categories as allCategories } from '@/types';
import { Pagination } from '@/components/ui/pagination';

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
});


export function PriceSettingsForm() {
  const { items, accessories, loading, updatePrices } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = translations[language];
  const TPrice = t.finance.priceSettingsPage;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const flattenedItems = useMemo(() => {
    return items
        .filter(item => !item.isArchived)
        .flatMap(item => {
        if (item.variants && item.variants.length > 0) {
            return item.variants.map(variant => ({
                id: variant.id,
                name: variant.name,
                parentName: item.name,
                sku: variant.sku,
                type: 'variant' as const,
                category: item.category,
                imageUrl: item.imageUrl,
                costPrice: variant.costPrice,
                price: variant.price,
                channelPrices: variant.channelPrices || [],
            }));
        }
        return {
            id: item.id,
            name: item.name,
            parentName: null,
            sku: item.sku,
            type: 'product' as const,
            category: item.category,
            imageUrl: item.imageUrl,
            costPrice: item.costPrice,
            price: item.price,
            channelPrices: item.channelPrices || [],
        };
    });
  }, [items]);
  
  const filteredItems = useMemo(() => {
    setCurrentPage(1);
    return flattenedItems
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm)) ||
          (item.parentName && item.parentName.toLowerCase().includes(lowerSearchTerm))
        );
      });
  }, [flattenedItems, categoryFilter, searchTerm]);
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [] },
  });
  
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const mappedItems = paginatedItems.map(item => ({
        id: item.id,
        type: item.type,
        costPrice: item.costPrice ?? undefined,
        price: item.price ?? undefined,
        channelPrices: [
            { channel: 'pos', price: item.channelPrices?.find(p => p.channel === 'pos')?.price ?? undefined },
            { channel: 'reseller', price: item.channelPrices?.find(p => p.channel === 'reseller')?.price ?? undefined },
            { channel: 'online', price: item.channelPrices?.find(p => p.channel === 'shopee')?.price ?? undefined },
        ]
    }));
    replace(mappedItems);
  }, [paginatedItems, replace]);


  if (loading) {
    return <Skeleton className="h-96 w-full" />
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    // When submitting, we need to map the form data back to include the correct IDs.
    // The `fields` from useFieldArray is paginated, so we use `paginatedItems` to get the real IDs.
    const updates = data.items.map((formItem, index) => ({
        ...formItem,
        id: paginatedItems[index].id,
        type: paginatedItems[index].type,
    })).filter((_, index) => {
        // Only include fields that are actually dirty to avoid unnecessary updates
        return form.formState.dirtyFields.items?.[index];
    });

    if (updates.length === 0) {
        toast({ title: TPrice.noChanges });
        setIsSubmitting(false);
        return;
    }

    try {
        await updatePrices(updates);
        toast({
            title: TPrice.successTitle,
            description: TPrice.successDesc,
        });
        form.reset(data, { keepValues: true }); // Resets dirty state
    } catch (error) {
        toast({
            variant: 'destructive',
            title: TPrice.errorTitle,
            description: TPrice.errorDesc,
        });
    } finally {
        setIsSubmitting(false);
    }
};

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-auto md:flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder={t.inventoryTable.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-96"
                        />
                    </div>
                    <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                        <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
                        {allCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                            {category}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                 <Button type="submit" disabled={!form.formState.isDirty || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {TPrice.saveButton}
                </Button>
            </div>
            
            <div className="border rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead className="w-[30%]">{t.inventoryTable.name}</TableHead>
                            <TableHead className="w-[12%]">{TPrice.costPrice}</TableHead>
                            <TableHead className="w-[12%]">{TPrice.sellingPrice}</TableHead>
                            <TableHead className="w-[12%]">{TPrice.posPrice}</TableHead>
                            <TableHead className="w-[12%]">{TPrice.resellerPrice}</TableHead>
                            <TableHead className="w-[12%]">{TPrice.onlinePrice}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {fields.map((field, index) => {
                            const originalItem = paginatedItems[index];
                            if (!originalItem) return null;

                             return (
                                <TableRow key={field.id} className={cn(originalItem.parentName ? "bg-background" : "bg-muted/30")}>
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
             <div className="flex items-center justify-end p-4">
                 <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </form>
    </Form>
  );
}

'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ShoppingBag, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import Image from 'next/image';
import { BulkStockInDialog } from '@/app/components/bulk-stock-in-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductSelectionDialog } from './product-selection-dialog';

const transactionItemSchema = z.object({
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.coerce.number().int().min(0, "Quantity must be at least 0."),
    parentName: z.string().optional(),
    parentSku: z.string().optional(),
    parentImageUrl: z.string().optional(),
    variantName: z.string().optional(),
    variantSku: z.string().optional(),
    isVariant: z.boolean(),
});

type TransactionItem = z.infer<typeof transactionItemSchema>;

const formSchema = z.object({
  transactionItems: z.array(transactionItemSchema),
  masterQuantities: z.record(z.coerce.number().int().optional())
});

export type TransactionSubmitData = z.infer<typeof formSchema>;

interface TransactionFormProps {
    transactionType: 'in' | 'out';
    isBulkQuantityOpen: boolean;
    setBulkQuantityOpen: (open: boolean) => void;
    isProductSelectionOpen: boolean;
    setProductSelectionOpen: (open: boolean) => void;
    bulkSelectedIds: Set<string>;
    setBulkSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    onFinalSubmit: (data: TransactionSubmitData) => void;
}

export function TransactionForm({
    transactionType,
    isBulkQuantityOpen,
    setBulkQuantityOpen,
    isProductSelectionOpen,
    setProductSelectionOpen,
    bulkSelectedIds,
    setBulkSelectedIds,
    onFinalSubmit,
}: TransactionFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const TStockForm = transactionType === 'in' ? t.stockInForm : t.stockOutForm;
  const { items, categories } = useInventory();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionItems: [],
      masterQuantities: {}
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "transactionItems"
  });
  
  const existingItemIds = useMemo(() => new Set(fields.map(field => field.itemId)), [fields]);

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    (items || []).forEach(item => {
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(variant => {
                map.set(variant.id, variant.stock);
            });
        } else if (item.stock !== undefined) {
            map.set(item.id, item.stock);
        }
    });
    return map;
  }, [items]);


  const handleSelectItems = (selectedItemIds: string[]) => {
    const itemsToAdd: TransactionItem[] = [];
    selectedItemIds.forEach(selectedId => {
      if (existingItemIds.has(selectedId)) return;

      for (const product of items) {
        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v.id === selectedId);
          if (variant) {
            itemsToAdd.push({
              itemId: variant.id,
              itemName: product.name,
              quantity: 0,
              parentName: product.name,
              parentSku: product.sku,
              parentImageUrl: product.imageUrl,
              variantName: variant.name,
              variantSku: variant.sku,
              isVariant: true,
            });
            break; 
          }
        } else if (product.id === selectedId) {
          itemsToAdd.push({
            itemId: product.id,
            itemName: product.name,
            quantity: 0,
            parentName: product.name,
            parentSku: product.sku,
            parentImageUrl: product.imageUrl,
            variantName: undefined,
            variantSku: undefined,
            isVariant: false,
          });
          break;
        }
      }
    });

    if(itemsToAdd.length > 0) {
        append(itemsToAdd);
    }
  };
  
  const applyMasterQuantity = (parentName: string) => {
    const masterQuantity = form.getValues(`masterQuantities.${parentName}`);
    if (masterQuantity !== undefined && masterQuantity >= 0) {
        fields.forEach((_field, index) => {
            const field = form.getValues(`transactionItems.${index}`);
            if (field.parentName === parentName) {
                form.setValue(`transactionItems.${index}.quantity`, masterQuantity, { shouldDirty: true, shouldValidate: true });
            }
        });
    }
  };
  
  const handleBulkApply = (quantity: number) => {
    fields.forEach((_field, index) => {
        const fieldItemId = form.getValues(`transactionItems.${index}.itemId`);
        if (bulkSelectedIds.has(fieldItemId)) {
            form.setValue(`transactionItems.${index}.quantity`, quantity, { shouldDirty: true });
        }
    });
    form.trigger('transactionItems');
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedIds = new Set<string>();
    if (checked) {
        fields.forEach(field => newSelectedIds.add(field.itemId));
    }
    setBulkSelectedIds(newSelectedIds);
  };

  const handleToggleSelection = (itemId: string) => {
    const newSelectedIds = new Set(bulkSelectedIds);
    if (newSelectedIds.has(itemId)) {
        newSelectedIds.delete(itemId);
    } else {
        newSelectedIds.add(itemId);
    }
    setBulkSelectedIds(newSelectedIds);
  };

  const isAllSelected = fields.length > 0 && bulkSelectedIds.size === fields.length;
  const isSomeSelected = bulkSelectedIds.size > 0 && !isAllSelected;

  const groupedItems = useMemo(() => {
    return fields.reduce((acc, field, index) => {
        const key = field.isVariant ? field.parentName || `parent-${field.itemId}` : `simple-${field.itemId}`;
        if (!acc[key]) {
            acc[key] = { 
                parentName: field.parentName,
                parentSku: field.parentSku,
                parentImageUrl: field.parentImageUrl,
                isParent: field.isVariant,
                items: []
            };
        }
        acc[key].items.push({ ...field, originalIndex: index });
        return acc;
    }, {} as Record<string, { parentName?: string; parentSku?: string; parentImageUrl?: string; isParent: boolean; items: (TransactionItem & { originalIndex: number })[] }>);
  }, [fields]);

  const handleToggleParentSelection = (groupItems: (TransactionItem & { originalIndex: number })[], checked: boolean) => {
    const newSelectedIds = new Set(bulkSelectedIds);
    const itemIds = groupItems.map(v => v.itemId);

    if (checked) {
        itemIds.forEach(id => newSelectedIds.add(id));
    } else {
        itemIds.forEach(id => newSelectedIds.delete(id));
    }
    setBulkSelectedIds(newSelectedIds);
  };
  
  const handleRemove = (indices: number[]) => {
    const sortedIndices = [...indices].sort((a,b) => b-a);
    sortedIndices.forEach(index => remove(index));
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onFinalSubmit(values);
  };

  return (
    <>
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
                <Card>
                    <CardContent className="p-0">
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={isAllSelected ? true : (isSomeSelected ? "indeterminate" : false)}
                                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                aria-label="Select all"
                                                disabled={fields.length === 0}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[45%]">{t.inventoryTable.name}</TableHead>
                                        <TableHead className="text-center">Stok Saat Ini</TableHead>
                                        <TableHead className="w-[20%]">{TStockForm.quantity}</TableHead>
                                        <TableHead className="text-center">Stok Akhir</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-48">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <ShoppingBag className="h-16 w-16" />
                                                    <div className="text-center">
                                                        <p className="font-semibold">{TStockForm.noProducts}</p>
                                                        <p className="text-sm">Klik "Pilih Produk" untuk memulai.</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                    Object.entries(groupedItems).map(([groupKey, group]) => {
                                            if (group.isParent) {
                                                const variantIds = group.items.map(v => v.itemId);
                                                const selectedCount = variantIds.filter(id => bulkSelectedIds.has(id)).length;
                                                const isParentAllSelected = selectedCount === variantIds.length;
                                                const isParentPartiallySelected = selectedCount > 0 && !isParentAllSelected;

                                                return (
                                                <React.Fragment key={groupKey}>
                                                    <TableRow className="bg-muted/20 hover:bg-muted/40">
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={isParentAllSelected ? true : (isParentPartiallySelected ? "indeterminate" : false)}
                                                                onCheckedChange={(checked) => handleToggleParentSelection(group.items, !!checked)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-4 font-semibold text-primary">
                                                                <Image src={group.parentImageUrl || 'https://placehold.co/40x40.png'} alt={group.parentName!} width={40} height={40} className="rounded-sm" data-ai-hint="product image" />
                                                                <div>
                                                                    <span className="text-sm">{group.parentName}</span>
                                                                    <div className="text-xs text-muted-foreground font-normal">SKU: {group.parentSku}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell colSpan={3}>
                                                            <div className="flex items-center gap-2">
                                                                <FormField control={form.control} name={`masterQuantities.${group.parentName}`} render={({ field }) => (
                                                                    <FormItem className="flex-grow"><FormControl><Input type="number" placeholder={TStockForm.quantity} {...field} value={field.value ?? ''} /></FormControl></FormItem>
                                                                )} />
                                                                <Button type="button" variant="outline" size="sm" onClick={() => applyMasterQuantity(group.parentName!)}>{t.common.apply}</Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleRemove(group.items.map(v => v.originalIndex))}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.items.map((field) => {
                                                        const originalIndex = field.originalIndex;
                                                        const currentStock = stockMap.get(field.itemId) ?? 0;
                                                        const quantity = form.watch(`transactionItems.${originalIndex}.quantity`) || 0;
                                                        const finalStock = transactionType === 'in' ? currentStock + (Number(quantity) || 0) : currentStock - (Number(quantity) || 0);

                                                        return (
                                                            <TableRow key={field.itemId} data-state={bulkSelectedIds.has(field.itemId) ? "selected" : ""}>
                                                                <TableCell><Checkbox checked={bulkSelectedIds.has(field.itemId)} onCheckedChange={() => handleToggleSelection(field.itemId)} /></TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm"><Store className="h-5 w-5 text-gray-400" /></div>
                                                                        <div>
                                                                            <div className="font-medium text-sm">{field.variantName}</div>
                                                                            <div className="text-xs text-muted-foreground">SKU: {field.variantSku}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">{currentStock}</TableCell>
                                                                <TableCell><FormField control={form.control} name={`transactionItems.${field.originalIndex}.quantity`} render={({ field: formField }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="0"
                                                                                {...formField}
                                                                                value={formField.value || ''}
                                                                                onChange={e => formField.onChange(e.target.valueAsNumber || 0)}
                                                                                min="0"
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage/>
                                                                    </FormItem>
                                                                )}/></TableCell>
                                                                <TableCell className="text-center">{finalStock}</TableCell>
                                                                <TableCell><Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(field.originalIndex)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                                )
                                            } else { // Simple products
                                                return group.items.map(field => {
                                                    const originalIndex = field.originalIndex;
                                                    const currentStock = stockMap.get(field.itemId) ?? 0;
                                                    const quantity = form.watch(`transactionItems.${originalIndex}.quantity`) || 0;
                                                    const finalStock = transactionType === 'in' ? currentStock + (Number(quantity) || 0) : currentStock - (Number(quantity) || 0);
                                                    
                                                    return (
                                                        <TableRow key={field.itemId} data-state={bulkSelectedIds.has(field.itemId) ? "selected" : ""}>
                                                            <TableCell><Checkbox checked={bulkSelectedIds.has(field.itemId)} onCheckedChange={() => handleToggleSelection(field.itemId)}/></TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-4">
                                                                    <Image src={field.parentImageUrl || 'https://placehold.co/40x40.png'} alt={field.itemName} width={40} height={40} className="rounded-sm" data-ai-hint="product image"/>
                                                                    <div>
                                                                        <span className="font-medium text-sm">{field.itemName}</span>
                                                                        <div className="text-xs text-muted-foreground">SKU: {field.parentSku}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">{currentStock}</TableCell>
                                                            <TableCell><FormField control={form.control} name={`transactionItems.${field.originalIndex}.quantity`} render={({ field: formField }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="0"
                                                                            {...formField}
                                                                            value={formField.value || ''}
                                                                            onChange={e => formField.onChange(e.target.valueAsNumber || 0)}
                                                                            min="0"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage/>
                                                                </FormItem>
                                                            )}/></TableCell>
                                                            <TableCell className="text-center">{finalStock}</TableCell>
                                                            <TableCell><Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(field.originalIndex)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                                        </TableRow>
                                                    );
                                                });
                                            }
                                    })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <FormMessage>{form.formState.errors.transactionItems?.message}</FormMessage>

                    </CardContent>
                    {fields.length > 0 && (
                        <CardFooter className="justify-end gap-2 pt-6">
                            <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                            <Button type="submit">
                                {TStockForm.submit}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </form>
    </Form>

    <BulkStockInDialog
        open={isBulkQuantityOpen}
        onOpenChange={setBulkQuantityOpen}
        onApply={(quantity) => handleBulkApply(quantity)}
    />
     <ProductSelectionDialog 
        open={isProductSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        onSelect={handleSelectItems}
        availableItems={items}
        categories={categories}
        initialSelectedIds={existingItemIds}
        title={TStockForm.selectProducts}
        description={TStockForm.description}
    />
    </>
  );
}

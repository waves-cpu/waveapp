
'use client';

import React, { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { InventoryItem } from '@/types';
import { ProductSelectionDialog } from './product-selection-dialog';
import Image from 'next/image';

const stockInItemSchema = z.object({
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.coerce.number().int().min(0, "Quantity must be at least 0."),
    reason: z.string().min(2, "Reason is required."),
    parentName: z.string().optional(),
    parentSku: z.string().optional(),
    parentImageUrl: z.string().optional(),
    variantName: z.string().optional(),
    isVariant: z.boolean(),
});

type StockInItem = z.infer<typeof stockInItemSchema>;

const formSchema = z.object({
  stockInItems: z.array(stockInItemSchema).nonempty("Please add at least one item to stock in."),
  masterQuantities: z.record(z.coerce.number().int().optional())
});

export function StockInForm() {
  const { language } = useLanguage();
  const t = translations[language];
  const { items, updateStock, categories } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isProductSelectionOpen, setProductSelectionOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stockInItems: [],
      masterQuantities: {}
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "stockInItems"
  });

  const allItemsAndVariantsById = useMemo(() => {
    const map = new Map<string, {name: string; parentName?: string; parentSku?: string; parentImageUrl?: string; variantName?: string; isVariant: boolean}>();
    items.forEach(item => {
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach(variant => {
                map.set(variant.id, { 
                    name: `${item.name} - ${variant.name}`,
                    parentName: item.name,
                    parentSku: item.sku,
                    parentImageUrl: item.imageUrl,
                    variantName: variant.name,
                    isVariant: true
                });
            });
        } else if (item.stock !== undefined) {
             map.set(item.id, { 
                name: item.name,
                isVariant: false,
                parentImageUrl: item.imageUrl,
             });
        }
    });
    return map;
  }, [items]);

  const existingItemIds = useMemo(() => new Set(fields.map(field => field.itemId)), [fields]);
  
  const availableItems = useMemo(() => {
    return items.filter(item => {
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
  }, [items, existingItemIds]);


  const handleProductsSelected = (selectedIds: string[]) => {
    const newItems = selectedIds
        .filter(id => !existingItemIds.has(id))
        .map(id => {
            const itemDetail = allItemsAndVariantsById.get(id);
            if (!itemDetail) return null;

            return {
                itemId: id,
                itemName: itemDetail.name,
                quantity: 1,
                reason: 'Stock In',
                parentName: itemDetail.parentName,
                parentSku: itemDetail.parentSku,
                parentImageUrl: itemDetail.parentImageUrl,
                variantName: itemDetail.variantName,
                isVariant: itemDetail.isVariant,
            };
        }).filter((item): item is StockInItem => item !== null);
    
    append(newItems);
  };
  
  const applyMasterQuantity = (parentName: string) => {
    const masterQuantity = form.getValues(`masterQuantities.${parentName}`);
    if (masterQuantity !== undefined && masterQuantity >= 0) {
        fields.forEach((_field, index) => {
            const field = form.getValues(`stockInItems.${index}`);
            if (field.parentName === parentName) {
                form.setValue(`stockInItems.${index}.quantity`, masterQuantity, { shouldDirty: true, shouldValidate: true });
            }
        });
    }
  };


  const groupedItems = useMemo(() => {
    const groups = new Map<string, (StockInItem & { originalIndex: number })[]>();
    const simpleItems: (StockInItem & { originalIndex: number })[] = [];
    
    fields.forEach((field, index) => {
        const formField = { ...field, originalIndex: index };
        if (formField.isVariant && formField.parentName) {
            if (!groups.has(formField.parentName)) {
                groups.set(formField.parentName, []);
            }
            groups.get(formField.parentName)!.push(formField);
        } else {
            simpleItems.push(formField);
        }
    });

    return { groups, simpleItems };
  }, [fields]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    values.stockInItems.forEach(item => {
        if(item.quantity > 0){
            updateStock(item.itemId, item.quantity, item.reason);
        }
    });

    toast({
        title: t.stockInForm.successTitle,
        description: t.stockInForm.successDescription.replace('{count}', values.stockInItems.filter(i => i.quantity > 0).length.toString()),
    });
    form.reset();
    router.push('/');
  }

  return (
    <>
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{t.stockInForm.title}</CardTitle>
                    <CardDescription>{t.stockInForm.description}</CardDescription>
                </div>
                <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t.stockInForm.selectProducts}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[45%]">{t.inventoryTable.name}</TableHead>
                                <TableHead className="w-[15%]">{t.stockInForm.quantity}</TableHead>
                                <TableHead>{t.stockInForm.reason}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        {t.stockInForm.noProducts}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                {groupedItems.simpleItems.map((field) => (
                                     <TableRow key={field.itemId}>
                                        <TableCell className="align-middle">
                                            <div className="flex items-center gap-4">
                                                <Image 
                                                    src={field.parentImageUrl || 'https://placehold.co/40x40.png'} 
                                                    alt={field.itemName} 
                                                    width={40} height={40} 
                                                    className="rounded-sm" 
                                                    data-ai-hint="product image"
                                                />
                                                <span className="font-medium">{field.itemName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <FormField
                                                control={form.control}
                                                name={`stockInItems.${field.originalIndex}.quantity`}
                                                render={({ field: formField }) => (
                                                    <FormItem><FormControl><Input type="number" placeholder="10" {...formField} /></FormControl><FormMessage/></FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <FormField
                                                control={form.control}
                                                name={`stockInItems.${field.originalIndex}.reason`}
                                                render={({ field: formField }) => (
                                                    <FormItem><FormControl><Input placeholder={t.updateStockDialog.reasonPlaceholder} {...formField} /></FormControl><FormMessage/></FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(field.originalIndex)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {Array.from(groupedItems.groups.entries()).map(([parentName, variants]) => {
                                    const parent = variants[0];
                                    return (
                                    <React.Fragment key={parentName}>
                                        <TableRow className="bg-muted/20 hover:bg-muted/40">
                                             <TableCell className="align-middle">
                                                <div className="flex items-center gap-4 font-semibold text-primary">
                                                    <Image 
                                                        src={parent.parentImageUrl || 'https://placehold.co/40x40.png'} 
                                                        alt={parentName} 
                                                        width={40} height={40} 
                                                        className="rounded-sm" 
                                                        data-ai-hint="product image"
                                                    />
                                                    <div>
                                                        <span>{parentName}</span>
                                                        <div className="text-xs text-muted-foreground font-normal">SKU: {parent.parentSku}</div>
                                                    </div>
                                                </div>
                                             </TableCell>
                                             <TableCell className="align-middle" colSpan={3}>
                                                <div className="flex items-center gap-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`masterQuantities.${parentName}`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-grow">
                                                               <FormControl><Input type="number" placeholder={t.stockInForm.quantity} {...field} value={field.value ?? ''} /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyMasterQuantity(parentName)}>
                                                        {t.bulkStockInDialog.applyToAll}
                                                    </Button>
                                                </div>
                                             </TableCell>
                                        </TableRow>
                                        {variants.map((field) => (
                                            <TableRow key={field.itemId}>
                                                <TableCell className="pl-16 align-middle">
                                                    <div className="font-medium text-sm">{field.variantName}</div>
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <FormField
                                                        control={form.control}
                                                        name={`stockInItems.${field.originalIndex}.quantity`}
                                                        render={({ field: formField }) => (
                                                            <FormItem><FormControl><Input type="number" placeholder="10" {...formField} /></FormControl><FormMessage/></FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <FormField
                                                        control={form.control}
                                                        name={`stockInItems.${field.originalIndex}.reason`}
                                                        render={({ field: formField }) => (
                                                            <FormItem><FormControl><Input placeholder={t.updateStockDialog.reasonPlaceholder} {...formField} /></FormControl><FormMessage/></FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="align-middle">
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(field.originalIndex)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                    )
                                })}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <FormMessage>{form.formState.errors.stockInItems?.message}</FormMessage>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                    <Button type="submit" disabled={fields.length === 0}>{t.stockInForm.submit}</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
    <ProductSelectionDialog
        open={isProductSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        onSelect={handleProductsSelected}
        availableItems={availableItems}
        categories={categories}
    />
    </>
  );
}


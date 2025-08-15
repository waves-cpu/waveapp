
'use client';

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
  FormLabel,
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
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { useState, useMemo } from 'react';
import { ProductSelectionDialog } from './product-selection-dialog';

const stockInItemSchema = z.object({
    itemId: z.string(),
    itemName: z.string(),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
    reason: z.string().min(2, "Reason is required."),
});

const formSchema = z.object({
  stockInItems: z.array(stockInItemSchema).nonempty("Please add at least one item to stock in."),
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
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "stockInItems"
  });

  const allItemsAndVariants = useMemo(() => items.flatMap(item => {
    if (item.variants && item.variants.length > 0) {
        return item.variants.map(variant => ({
            id: variant.id,
            name: `${item.name} - ${variant.name}`,
            category: item.category,
            stock: variant.stock,
            sku: variant.sku,
        }));
    }
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        stock: item.stock ?? 0,
        sku: item.sku,
    }
  }), [items]);

  const existingItemIds = useMemo(() => new Set(fields.map(field => field.itemId)), [fields]);
  const availableItems = useMemo(() => allItemsAndVariants.filter(item => !existingItemIds.has(item.id)), [allItemsAndVariants, existingItemIds]);

  const handleProductsSelected = (selectedIds: string[]) => {
    const existingIds = new Set(fields.map(field => field.itemId));
    const newItems = selectedIds
        .filter(id => !existingIds.has(id))
        .map(id => {
            const item = allItemsAndVariants.find(i => i.id === id);
            return {
                itemId: id,
                itemName: item?.name || 'Unknown Item',
                quantity: 1,
                reason: 'Stock In'
            };
        });
    
    append(newItems);
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    values.stockInItems.forEach(item => {
        updateStock(item.itemId, item.quantity, item.reason);
    });

    toast({
        title: "Stock In Successful",
        description: `${values.stockInItems.length} item(s) have been updated.`,
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
                    <CardTitle>Create Stock In Record</CardTitle>
                    <CardDescription>Add new stock received from suppliers or other sources.</CardDescription>
                </div>
                <Button type="button" onClick={() => setProductSelectionOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Select Products
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="max-h-[50vh] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[45%]">Product</TableHead>
                                <TableHead className="w-[15%]">Quantity</TableHead>
                                <TableHead>Reason / Note</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="font-medium">{field.itemName}</TableCell>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`stockInItems.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`stockInItems.${index}.reason`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl><Input placeholder="e.g., From Supplier A" {...field} /></FormControl>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No products selected. Click "Select Products" to begin.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <FormMessage>{form.formState.errors.stockInItems?.message}</FormMessage>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                    <Button type="submit" disabled={fields.length === 0}>Submit Stock In</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
    <ProductSelectionDialog
        open={isProductSelectionOpen}
        onOpenChange={setProductSelectionOpen}
        onSelect={handleProductsSelected}
        allItems={availableItems}
        categories={categories}
    />
    </>
  );
}

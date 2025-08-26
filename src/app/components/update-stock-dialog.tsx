
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { InventoryItem, InventoryItemVariant } from '@/types';

interface UpdateStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function UpdateStockDialog({ open, onOpenChange, itemId }: UpdateStockDialogProps) {
  const { updateStock, items } = useInventory();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language];

  const formSchema = z.object({
    stockChange: z.coerce.number().int().refine(val => val !== 0, { message: "Perubahan tidak boleh nol." }),
    reason: z.string().min(2, { message: t.updateStockDialog.reasonRequired }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stockChange: undefined,
      reason: '',
    },
  });
  
  const { item, displayName, stock } = React.useMemo(() => {
    if (!itemId) return { item: undefined, displayName: '', stock: undefined };

    let foundItem: InventoryItem | InventoryItemVariant | undefined;
    let foundDisplayName = '';
    let foundStock: number | undefined;

    for (const product of items) {
        // Check if the item is a simple product
        if (product.id === itemId) {
            foundItem = product;
            foundDisplayName = product.name;
            foundStock = product.stock;
            break;
        }
        // Check if the item is a variant
        if (product.variants) {
            const variant = product.variants.find(v => v.id === itemId);
            if (variant) {
                foundItem = variant;
                foundDisplayName = `${product.name} - ${variant.name}`;
                foundStock = variant.stock;
                break;
            }
        }
    }
    
    return { item: foundItem, displayName: foundDisplayName, stock: foundStock };
  }, [itemId, items]);


  useEffect(() => {
    if (!open) {
      form.reset({ stockChange: undefined, reason: '' });
    }
  }, [open, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!itemId || stock === undefined) return;
    
    const change = values.stockChange;
    
    updateStock(itemId, change, values.reason);
    toast({
    title: t.updateStockDialog.stockUpdated,
    description: `${t.updateStockDialog.stockFor} ${displayName} ${t.updateStockDialog.hasBeenAdjusted}`,
    });

    onOpenChange(false);
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.updateStockDialog.title} {displayName}</DialogTitle>
          <DialogDescription>
             {t.updateStockDialog.description} {stock ?? 0}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="stockChange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.updateStockDialog.stockAdjustment}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t.updateStockDialog.stockAdjustmentPlaceholder} {...field} value={field.value === undefined ? '' : field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.updateStockDialog.reason}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.updateStockDialog.reasonPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit" disabled={stock === undefined}>{t.updateStockDialog.updateStock}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

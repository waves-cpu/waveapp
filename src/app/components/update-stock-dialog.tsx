
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
    newStock: z.coerce.number().int().min(0, t.updateStockDialog.stockMustBePositive),
    reason: z.string().min(2, { message: t.updateStockDialog.reasonRequired }),
  });
    
  const [itemDetails, setItemDetails] = useState<{ parentName: string, variantName: string, stock: number | undefined }>({
      parentName: '',
      variantName: '',
      stock: undefined,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newStock: undefined,
      reason: '',
    },
  });

  useEffect(() => {
    if (open && itemId) {
        // Find if the itemId matches a simple product (no variants)
        const simpleProduct = items.find(i => i.id === itemId && (!i.variants || i.variants.length === 0));
        
        if (simpleProduct) {
            setItemDetails({
                parentName: simpleProduct.name,
                variantName: '',
                stock: simpleProduct.stock,
            });
            form.setValue('newStock', simpleProduct.stock);
        } else {
            // Otherwise, find the parent product and the specific variant
            let parentItem: InventoryItem | undefined;
            let variant: InventoryItemVariant | undefined;

            for (const p of items) {
                if (p.variants && p.variants.length > 0) {
                    const foundVariant = p.variants.find(v => v.id === itemId);
                    if (foundVariant) {
                        parentItem = p;
                        variant = foundVariant;
                        break;
                    }
                }
            }

            if (parentItem && variant) {
                setItemDetails({
                    parentName: parentItem.name,
                    variantName: variant.name,
                    stock: variant.stock,
                });
                form.setValue('newStock', variant.stock);
            }
        }
    } else if (!open) {
        form.reset({ newStock: undefined, reason: '' });
        setItemDetails({ parentName: '', variantName: '', stock: undefined });
    }
  }, [open, itemId, items, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!itemId || itemDetails.stock === undefined) return;
    
    const change = values.newStock - itemDetails.stock;
    
    if (change === 0) {
        onOpenChange(false);
        return;
    }
    
    updateStock(itemId, change, values.reason);
    toast({
      title: t.updateStockDialog.stockUpdated,
      description: `${t.updateStockDialog.stockFor} ${itemDetails.parentName} ${itemDetails.variantName} ${t.updateStockDialog.hasBeenAdjusted}`,
    });

    onOpenChange(false);
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.updateStockDialog.title}</DialogTitle>
           <div className="pt-2 text-sm text-muted-foreground">
             <div className='font-semibold text-foreground'>{itemDetails.parentName}</div>
             <div>
               {itemDetails.variantName ? `${itemDetails.variantName}: ` : ''}
               {t.updateStockDialog.description} {itemDetails.stock ?? 0}
             </div>
           </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="newStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.updateStockDialog.newStockLevel}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50" {...field} value={field.value === undefined ? '' : field.value} />
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
                <Button type="submit" disabled={itemDetails.stock === undefined}>{t.updateStockDialog.updateStock}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

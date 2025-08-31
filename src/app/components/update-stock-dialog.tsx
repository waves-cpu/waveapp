
'use client';

import React, { useEffect, useMemo } from 'react';
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newStock: undefined,
      reason: '',
    },
  });
  
  const { parentName, variantName, stock } = useMemo(() => {
    if (!itemId) return { parentName: '', variantName: '', stock: undefined };

    for (const product of items) {
        if (product.id === itemId && (!product.variants || product.variants.length === 0)) {
             return { parentName: product.name, variantName: '', stock: product.stock };
        }
        if (product.variants) {
            const variant = product.variants.find(v => v.id === itemId);
            if (variant) {
                return { parentName: product.name, variantName: variant.name, stock: variant.stock };
            }
        }
    }
    
    return { parentName: '', variantName: '', stock: undefined };
  }, [itemId, items]);


  useEffect(() => {
    if (!open) {
      form.reset({ newStock: undefined, reason: '' });
    } else if (stock !== undefined) {
      form.setValue('newStock', stock);
    }
  }, [open, stock, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!itemId || stock === undefined) return;
    
    const change = values.newStock - stock;
    
    if (change === 0) {
        onOpenChange(false);
        return;
    }
    
    updateStock(itemId, change, values.reason);
    toast({
      title: t.updateStockDialog.stockUpdated,
      description: `${t.updateStockDialog.stockFor} ${parentName} ${variantName} ${t.updateStockDialog.hasBeenAdjusted}`,
    });

    onOpenChange(false);
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.updateStockDialog.title}</DialogTitle>
           <div className="pt-2 text-sm text-muted-foreground">
             <div className='font-semibold text-foreground'>{parentName}</div>
             <div>
               {variantName ? `${variantName}: ` : ''}
               {t.updateStockDialog.description} {stock ?? 0}
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
                <Button type="submit" disabled={stock === undefined}>{t.updateStockDialog.updateStock}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

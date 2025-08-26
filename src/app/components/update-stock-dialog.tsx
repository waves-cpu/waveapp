
'use client';

import { useEffect } from 'react';
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
  const { updateStock, getItem } = useInventory();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language];

  const formSchema = z.object({
    newStockLevel: z.coerce.number().int().min(0, { message: t.updateStockDialog.stockMustBePositive }),
    reason: z.string().min(2, { message: t.updateStockDialog.reasonRequired }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newStockLevel: 0,
      reason: '',
    },
  });

  const parentItem = itemId ? getItem(itemId) : null;

  // This logic now correctly finds either the variant or the simple product.
  const item = parentItem
    ? (parentItem.variants?.find(v => v.id === itemId) || (parentItem.id === itemId ? parentItem : undefined))
    : null;

  const stock = item?.stock;


  useEffect(() => {
    if (open && stock !== undefined) {
      form.reset({ newStockLevel: stock, reason: '' });
    }
    if (!open) {
      form.reset({ newStockLevel: 0, reason: '' });
    }
  }, [open, stock, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!itemId || stock === undefined) return;
    
    const change = values.newStockLevel - stock;
    
    // Only update if there is a change
    if (change !== 0) {
        updateStock(itemId, change, values.reason);
        toast({
        title: t.updateStockDialog.stockUpdated,
        description: `${t.updateStockDialog.stockFor} ${item?.name} ${t.updateStockDialog.hasBeenAdjusted}`,
        });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.updateStockDialog.title} {item?.name}</DialogTitle>
          <DialogDescription>
             {t.updateStockDialog.description} {stock}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="newStockLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.updateStockDialog.newStockLevel}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50" {...field} />
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


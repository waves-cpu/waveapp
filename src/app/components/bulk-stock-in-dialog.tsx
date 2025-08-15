
'use client';

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
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useEffect } from 'react';

const formSchema = z.object({
  quantity: z.coerce.number().int().min(0, "Quantity must be non-negative."),
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
});


interface BulkStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (quantity: number, reason: string) => void;
}

export function BulkStockInDialog({ open, onOpenChange, onApply }: BulkStockInDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      reason: 'Stock In',
    },
  });

  useEffect(() => {
    if(open) {
        form.reset({
            quantity: 1,
            reason: 'Stock In',
        });
    }
  }, [open, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onApply(values.quantity, values.reason);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.bulkStockInDialog.title}</DialogTitle>
          <DialogDescription>
            {t.bulkStockInDialog.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.stockInForm.quantity}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10" {...field} />
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
                  <FormLabel>{t.stockInForm.reason}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.updateStockDialog.reasonPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">{t.common.apply}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


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
import { useEffect, useState } from 'react';
import { Textarea } from './textarea';

const formSchema = z.object({
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
});


interface ConfirmStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  itemCount: number;
}

export function ConfirmStockInDialog({ open, onOpenChange, onConfirm, itemCount }: ConfirmStockInDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: 'Stock In',
    },
  });

  useEffect(() => {
    if(open) {
        form.reset({
            reason: 'Stock In',
        });
        setIsSubmitting(false);
    }
  }, [open, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    await onConfirm(values.reason);
    // isSubmitting will be reset when dialog is reopened
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.stockInForm.title}</DialogTitle>
          <DialogDescription>
            Anda akan menambahkan stok untuk {itemCount} jenis produk. Masukkan alasan atau catatan untuk transaksi ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.stockInForm.reason}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t.updateStockDialog.reasonPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>{t.common.cancel}</Button>
                <Button type="submit" disabled={isSubmitting || itemCount === 0}>
                    {isSubmitting ? t.common.saving : t.stockInForm.submit}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

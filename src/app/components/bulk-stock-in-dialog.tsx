
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
import { useEffect, useState } from 'react';

const formSchema = z.object({
  quantity: z.coerce.number().int().min(0, "Quantity must be a non-negative number."),
});


interface BulkStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (quantity: number) => void;
}

export function BulkStockInDialog({ open, onOpenChange, onApply }: BulkStockInDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const TBulk = t.bulkStockInDialog;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
    },
  });

  useEffect(() => {
    if(!open) {
        form.reset({ quantity: 0 });
        setIsSubmitting(false);
    }
  }, [open, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    onApply(values.quantity);
    setIsSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{TBulk.title}</DialogTitle>
          <DialogDescription>
            {TBulk.description}
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
                    <Input type="number" placeholder="e.g., 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>{t.common.cancel}</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {t.common.apply}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

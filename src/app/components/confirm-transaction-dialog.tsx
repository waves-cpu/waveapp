

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
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
});


interface ConfirmTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  itemCount: number;
  title: string;
  description: string;
  submitText: string;
  reasonLabel: string;
  defaultReason: string;
}

export function ConfirmTransactionDialog({ 
    open, 
    onOpenChange, 
    onConfirm, 
    itemCount,
    title,
    description,
    submitText,
    reasonLabel,
    defaultReason
}: ConfirmTransactionDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: defaultReason,
    },
  });

  useEffect(() => {
    if(open) {
        form.reset({
            reason: defaultReason,
        });
        setIsSubmitting(false);
    }
  }, [open, form, defaultReason]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    await onConfirm(values.reason);
    // isSubmitting will be reset when dialog is reopened
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{reasonLabel}</FormLabel>
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
                    {isSubmitting ? t.common.saving : submitText}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

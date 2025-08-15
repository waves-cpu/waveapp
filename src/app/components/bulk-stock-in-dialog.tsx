'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
  FormMessage,
} from '@/components/ui/form';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';

const variantSchema = z.object({
  itemId: z.string(),
  variantName: z.string(),
  quantity: z.coerce.number().int().min(0, "Quantity must be a non-negative integer."),
  reason: z.string().min(2, "Reason is required."),
});

const formSchema = z.object({
  variants: z.array(variantSchema),
  masterReason: z.string().optional(),
});

interface BulkStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  variants: z.infer<typeof variantSchema>[];
  onSave: (updatedVariants: z.infer<typeof variantSchema>[]) => void;
}

export function BulkStockInDialog({ open, onOpenChange, productName, variants, onSave }: BulkStockInDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variants: [],
      masterReason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ variants });
    }
  }, [open, variants, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  function applyMasterReason() {
    const masterReason = form.getValues('masterReason');
    if (masterReason) {
      fields.forEach((field, index) => {
        form.setValue(`variants.${index}.reason`, masterReason);
      });
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values.variants);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.bulkStockInDialog.title} {productName}</DialogTitle>
          <DialogDescription>
            {t.bulkStockInDialog.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex gap-2">
                <FormField
                    control={form.control}
                    name="masterReason"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl><Input placeholder={t.bulkStockInDialog.applyReasonPlaceholder} {...field} /></FormControl>
                        </FormItem>
                    )}
                />
                <Button type="button" variant="outline" onClick={applyMasterReason}>{t.bulkStockInDialog.applyToAll}</Button>
             </div>
            <ScrollArea className="h-96 border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t.bulkStockInDialog.variantName}</TableHead>
                        <TableHead className="w-[120px]">{t.stockInForm.quantity}</TableHead>
                        <TableHead>{t.stockInForm.reason}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fields.map((field, index) => (
                        <TableRow key={field.id}>
                            <TableCell className="font-medium">{field.variantName}</TableCell>
                            <TableCell>
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.quantity`}
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
                                    name={`variants.${index}.reason`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Input placeholder={t.updateStockDialog.reasonPlaceholder} {...field} /></FormControl>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">{t.common.saveChanges}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

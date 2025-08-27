
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
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { InventoryItem } from '@/types';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const variantSchema = z.object({
  id: z.string(),
  name: z.string(), // Keep for display
  sku: z.string().optional(), // Keep for display
  price: z.coerce.number(), // Keep for context if needed, but not editable
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const formSchema = z.object({
  variants: z.array(variantSchema),
  bulkStock: z.coerce.number().optional(),
});


interface BulkEditVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

export function BulkEditVariantsDialog({ open, onOpenChange, item }: BulkEditVariantsDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { bulkUpdateVariants } = useInventory();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variants: item.variants || [],
      bulkStock: undefined,
    },
  });

  useEffect(() => {
    if (open && item) {
        form.reset({
            variants: item.variants || [],
            bulkStock: undefined,
        });
    }
  }, [open, item, form]);


  const { fields } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // We only send stock updates, but the form holds other data for display
    const stockOnlyUpdates = values.variants.map(v => ({ id: v.id, stock: v.stock, name: v.name, price: v.price, sku: v.sku }));
    bulkUpdateVariants(item.id, stockOnlyUpdates);
    toast({
      title: "Varian Diperbarui",
      description: `Stok untuk varian ${item.name} telah diperbarui.`,
    });
    onOpenChange(false);
  }

  const handleApplyBulkStock = () => {
    const bulkValue = form.getValues("bulkStock");
    if (bulkValue !== undefined && bulkValue >= 0) {
        fields.forEach((_, index) => {
            form.setValue(`variants.${index}.stock`, bulkValue, { shouldDirty: true, shouldValidate: true });
        });
    } else {
        toast({
            variant: 'destructive',
            title: "Nilai Tidak Valid",
            description: "Harap masukkan jumlah stok yang valid (angka non-negatif)."
        });
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
            <DialogTitle>Atur Stok</DialogTitle>
            <div className="flex items-start gap-4 pt-2">
                <Image 
                    src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                    alt={item.name} 
                    width={40} 
                    height={40} 
                    className="rounded-md"
                    data-ai-hint="product image"
                />
                <div className="pt-1">
                    <p className="font-semibold text-base">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU Induk: {item.sku}</p>
                </div>
            </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 py-4 space-y-4">
                <div className="flex items-center gap-2 rounded-md border p-3">
                     <FormField
                        control={form.control}
                        name="bulkStock"
                        render={({ field }) => (
                           <Input 
                            type="number" 
                            placeholder="Stok" 
                            className="h-9" 
                            {...field}
                            value={field.value ?? ''}
                           />
                        )}
                    />
                    <Button type="button" variant="outline" onClick={handleApplyBulkStock}>Terapkan semua</Button>
                </div>

                <div className="border rounded-md">
                     <div className="flex justify-between items-center p-3 border-b">
                        <h4 className="text-sm font-semibold w-[60%]">Variasi</h4>
                        <h4 className="text-sm font-semibold w-[40%] text-left pl-1">Total Stok</h4>
                    </div>
                    <ScrollArea className="h-64">
                    <div className="divide-y">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-3 py-5">
                            <div className="w-[60%]">
                                <p className="font-medium text-sm">{field.name}</p>
                                {field.sku && <p className="text-xs text-muted-foreground">SKU: {field.sku}</p>}
                            </div>
                            <div className="w-[40%]">
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.stock`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Input type="number" placeholder="0" {...field} className="h-9 w-32" /></FormControl>
                                            <FormMessage className="text-xs"/>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                    </div>
                    </ScrollArea>
                </div>
            </div>

            <DialogFooter className="bg-muted p-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

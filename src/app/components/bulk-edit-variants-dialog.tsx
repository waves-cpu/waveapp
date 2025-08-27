
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { InventoryItem } from '@/types';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const variantSchema = z.object({
  id: z.string(),
  name: z.string(), 
  sku: z.string().optional(), 
  price: z.coerce.number(),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const formSchema = z.object({
  variants: z.array(variantSchema),
  bulkStock: z.coerce.number().optional(),
  reason: z.string().min(2, { message: "Alasan harus diisi (min. 2 karakter)." }),
});


interface BulkEditVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

export function BulkEditVariantsDialog({ open, onOpenChange, item }: BulkEditVariantsDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const TBulk = t.bulkEditDialog;
  const { bulkUpdateVariants } = useInventory();
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variants: [],
      bulkStock: undefined,
      reason: TBulk.defaultReason,
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "variants"
  });
  
  useEffect(() => {
    if (open) {
        form.reset({
            variants: item.variants || [],
            bulkStock: undefined,
            reason: TBulk.defaultReason,
        });
    }
  }, [open, item, TBulk.defaultReason, form]);


  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, fields.length);
  }, [fields.length]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const stockOnlyUpdates = values.variants.map(v => ({ id: v.id, stock: v.stock, name: v.name, price: v.price, sku: v.sku }));
    bulkUpdateVariants(item.id, stockOnlyUpdates, values.reason);
    toast({
      title: TBulk.successToastTitle,
      description: TBulk.successToastDesc.replace('{name}', item.name),
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
            title: TBulk.invalidValueToastTitle,
            description: TBulk.invalidValueToastDesc,
        });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const nextInput = inputRefs.current[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        } else {
            // Focus on the reason input after the last stock input
            const reasonInput = (e.target as HTMLElement).form?.elements.namedItem('reason');
            if (reasonInput instanceof HTMLInputElement) {
                reasonInput.focus();
            }
        }
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-4">
                <Image 
                    src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                    alt={item.name} 
                    width={40} 
                    height={40} 
                    className="rounded-md shrink-0"
                    data-ai-hint="product image"
                />
                <div className="pt-1">
                    <DialogTitle className="text-base">{TBulk.title}</DialogTitle>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{TBulk.parentSkuLabel}: {item.sku}</p>
                </div>
            </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-6 pb-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        placeholder={TBulk.bulkStockPlaceholder} 
                        className="h-9" 
                        {...form.register("bulkStock")}
                    />
                    <Button type="button" variant="outline" onClick={handleApplyBulkStock}>{TBulk.applyToAll}</Button>
                </div>

                <div className="border rounded-md">
                     <div className="flex justify-between items-center p-3 border-b bg-muted/50">
                        <h4 className="text-sm font-semibold w-[60%]">{TBulk.variationColumn}</h4>
                        <h4 className="text-sm font-semibold w-[40%] text-left pl-1">{TBulk.totalStockColumn}</h4>
                    </div>
                    <ScrollArea className={cn("h-auto", { "h-64": fields.length > 5 })}>
                    <div className="divide-y">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-3 py-3.5">
                            <div className="w-[60%]">
                                <p className="font-medium text-sm">{field.name}</p>
                                {field.sku && <p className="text-xs text-muted-foreground">SKU: {field.sku}</p>}
                            </div>
                            <div className="w-[40%]">
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.stock`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    placeholder="0" 
                                                    {...formField} 
                                                    className="h-9 w-32" 
                                                    ref={el => inputRefs.current[index] = el}
                                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                                />
                                            </FormControl>
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
                 <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">{TBulk.reasonLabel}</FormLabel>
                            <FormControl>
                                <Input placeholder={TBulk.reasonPlaceholder} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="bg-muted p-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">{t.common.update}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

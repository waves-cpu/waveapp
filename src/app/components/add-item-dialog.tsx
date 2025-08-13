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
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  sku: z.string().optional(),
  hasVariants: z.boolean().default(false),
  // Fields for items without variants
  price: z.coerce.number().optional(),
  stock: z.coerce.number().int().optional(),
  size: z.string().optional(),
}).refine(data => {
    if (!data.hasVariants) {
        return data.price !== undefined && data.price >= 0 && data.stock !== undefined && data.stock >= 0;
    }
    return true;
}, {
    message: "Price and stock are required for items without variants.",
    path: ["price"], // you can specify which field to show the error on
});


interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { addItem } = useInventory();
  const { toast } = useToast();
  const [hasVariants, setHasVariants] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      sku: '',
      hasVariants: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Note: This simplified form only adds a parent product or a simple product.
    // A more complex UI would be needed to add variants at the same time.
    const itemData = {
        name: values.name,
        category: values.category,
        sku: values.sku,
        price: values.hasVariants ? undefined : values.price,
        stock: values.hasVariants ? undefined : values.stock,
        size: values.hasVariants ? undefined : values.size,
    };

    addItem(itemData as any); // Cast to any to handle the conditional properties
    toast({
      title: t.addItemDialog.itemAdded,
      description: `${values.name} ${t.addItemDialog.hasBeenAdded}`,
    });
    form.reset();
    setHasVariants(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t.addItemDialog.title}</DialogTitle>
          <DialogDescription>
            {t.addItemDialog.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.addItemDialog.itemName}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.addItemDialog.itemNamePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.addItemDialog.category}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.addItemDialog.categoryPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SKU12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="hasVariants"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    setHasVariants(!!checked);
                                }}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>This product has multiple variants (e.g., sizes, colors)</FormLabel>
                        </div>
                    </FormItem>
                )}
            />

            {!hasVariants && (
                <>
                    <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Size/Variation</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 250g, 1L, Large" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.addItemDialog.price}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t.addItemDialog.pricePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.addItemDialog.initialStock}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t.addItemDialog.initialStockPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
            )}


            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">{t.addItemDialog.addItem}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
  size: z.string().optional(),
});


export function AddAccessoryForm() {
  const { language } = useLanguage();
  const t = translations[language];
  const { addAccessory } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        sku: '',
        price: undefined,
        stock: undefined,
        size: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        await addAccessory(values);
        toast({
        title: t.addItemDialog.itemAdded,
        description: `${values.name} ${t.addItemDialog.hasBeenAdded}`,
        });
        router.push('/inventory/accessories');
    } catch (error) {
        console.error("Failed to save accessory:", error);
        toast({
            title: "Error",
            description: "Failed to save accessory. Please try again.",
            variant: "destructive"
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
        <CardContent className="pt-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.addItemDialog.itemName}</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Label Woven" {...field} />
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
                        <Input placeholder="e.g., LBL-WVN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.inventoryTable.size}</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 100 pcs" {...field} value={field.value ?? ''}/>
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
                            <Input type="number" placeholder={t.addItemDialog.pricePlaceholder} {...field} value={field.value ?? ''} />
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
                            <Input type="number" placeholder={t.addItemDialog.initialStockPlaceholder} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <div className="flex justify-end gap-2 border-t pt-6">
                    <Button type="button" variant="ghost" onClick={() => router.push('/inventory/accessories')} disabled={isSubmitting}>{t.common.cancel}</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : t.dashboard.addAccessory}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}

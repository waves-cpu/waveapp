
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
import { useState, useMemo } from 'react';
import type { Accessory } from '@/types';

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
  size: z.string().optional(),
});

interface EditAccessoryFormProps {
    existingItem: Accessory;
}

export function EditAccessoryForm({ existingItem }: EditAccessoryFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { updateAccessory } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => {
    return {
        id: existingItem.id,
        name: existingItem.name,
        sku: existingItem.sku || '',
        price: existingItem.price ?? '',
        stock: existingItem.stock ?? '',
        size: existingItem.size || '',
    };
  }, [existingItem]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        await updateAccessory(values.id, values);
        toast({
        title: "Aksesoris Diperbarui",
        description: `${values.name} telah berhasil diperbarui.`,
        });
        router.push('/inventory/accessories');
    } catch (error) {
        console.error("Failed to save accessory:", error);
        toast({
            title: "Error",
            description: "Gagal menyimpan aksesoris. Silakan coba lagi.",
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
                        {isSubmitting ? t.common.saving : t.common.saveChanges}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}

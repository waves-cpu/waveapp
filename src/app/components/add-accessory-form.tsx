
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { accessoryCategories, type AccessoryUnit } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nama harus diisi minimal 2 karakter.' }),
  category: z.string().min(1, { message: 'Kategori harus diisi.' }),
  sku: z.string().optional(),
  unit: z.enum(['Box', 'Pcs', 'Pack', 'Bundle'], { required_error: "Satuan harus dipilih."}),
  quantityPerUnit: z.coerce.number().int().optional(),
  price: z.coerce.number().min(0, "Harga harus non-negatif."),
  stock: z.coerce.number().int().min(0, "Stok harus berupa angka non-negatif."),
}).refine(data => {
    if (data.unit === 'Box' || data.unit === 'Pack' || data.unit === 'Bundle') {
        return data.quantityPerUnit !== undefined && data.quantityPerUnit > 0;
    }
    return true;
}, {
    message: "Jumlah per unit harus diisi jika satuan adalah Box, Pack, atau Bundle.",
    path: ["quantityPerUnit"],
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
        category: 'Hangtag',
        sku: '',
        unit: 'Pcs',
        quantityPerUnit: undefined,
        price: '' as any,
        stock: '' as any,
    },
  });

  const selectedUnit = form.watch('unit') as AccessoryUnit;

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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nama Barang</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Label Woven Hitam" {...field} />
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
                            <FormLabel>Kategori</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {accessoryCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Satuan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih Satuan" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {(['Pcs', 'Box', 'Pack', 'Bundle'] as AccessoryUnit[]).map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                        {unit}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {(selectedUnit === 'Box' || selectedUnit === 'Pack' || selectedUnit === 'Bundle') && (
                        <FormField
                            control={form.control}
                            name="quantityPerUnit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Jumlah per {selectedUnit}</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder={`e.g., 100`} {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., LBL-WVN-01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Harga (per {selectedUnit})</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="50000" {...field} value={field.value ?? ''} />
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
                        <FormLabel>Stok (dalam {selectedUnit})</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="100" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                <div className="flex justify-end gap-2 border-t pt-6">
                    <Button type="button" variant="ghost" onClick={() => router.push('/inventory/accessories')} disabled={isSubmitting}>{t.common.cancel}</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Menyimpan...' : t.dashboard.addAccessory}
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}

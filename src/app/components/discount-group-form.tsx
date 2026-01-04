

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DiscountGroup, DiscountedProduct } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

const discountedProductSchema = z.object({
  productId: z.number(),
  variantId: z.number().optional(),
  productName: z.string(),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().optional(),
  originalPrice: z.number().nullable(),
  discountedPrice: z.coerce.number().min(0, "Harga harus non-negatif."),
});

const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: 'Nama grup diskon minimal 2 karakter.' }),
  category: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  channel: z.string().min(1, { message: 'Kanal penjualan harus dipilih.' }),
  voucherCode: z.string().optional(),
  dateRange: z.object({
      from: z.date({ required_error: "Tanggal mulai harus diisi." }),
      to: z.date({ required_error: "Tanggal berakhir harus diisi." }),
  }),
  products: z.array(discountedProductSchema).optional(), // Now optional
  discountType: z.enum(['fixed', 'percentage']),
  discountValue: z.coerce.number().min(1, "Nilai diskon harus diisi."),
  maxUses: z.coerce.number().optional(),
  minPurchase: z.coerce.number().optional(),
});

interface DiscountGroupFormProps {
    existingGroup?: DiscountGroup;
    isVoucherForm?: boolean;
}

export function DiscountGroupForm({ existingGroup, isVoucherForm = false }: DiscountGroupFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { items, addDiscountGroup, editDiscountGroup } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!existingGroup;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...existingGroup,
        dateRange: {
            from: new Date(existingGroup.startDate),
            to: new Date(existingGroup.endDate),
        },
        discountType: existingGroup.discountType || 'fixed',
    } : {
      name: '',
      category: '',
      channel: '',
      voucherCode: '',
      dateRange: { from: new Date(), to: addDays(new Date(), 7) },
      products: [],
      discountType: 'fixed',
    },
  });
  
  const selectedCategory = form.watch('category');

  useEffect(() => {
    if (!isVoucherForm && selectedCategory) {
        const productsInCategory = items.filter(item => item.category === selectedCategory && !item.isArchived);
        const discountedProducts: DiscountedProduct[] = [];
        
        productsInCategory.forEach(product => {
            const baseProductInfo = {
                productId: Number(product.id),
                productName: product.name,
                sku: product.sku,
                imageUrl: product.imageUrl,
            };
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const existingDiscount = existingGroup?.products.find(p => p.variantId === Number(variant.id));
                    discountedProducts.push({
                        ...baseProductInfo,
                        variantId: Number(variant.id),
                        variantName: variant.name,
                        sku: variant.sku,
                        originalPrice: variant.price,
                        discountedPrice: existingDiscount?.discountedPrice ?? variant.price,
                    });
                });
            } else {
                const existingDiscount = existingGroup?.products.find(p => p.productId === Number(product.id) && !p.variantId);
                discountedProducts.push({
                    ...baseProductInfo,
                    originalPrice: product.price ?? null,
                    discountedPrice: existingDiscount?.discountedPrice ?? (product.price || 0),
                });
            }
        });
        form.setValue('products', discountedProducts);
    } else {
        form.setValue('products', []);
    }
}, [selectedCategory, items, form, isVoucherForm, existingGroup]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // For vouchers, products array will be empty. For automatic discounts, it will be populated.
    const productsPayload = (isVoucherForm || values.category === 'Semua Kategori') ? [] : values.products?.filter(p => p.originalPrice !== null);

    if (!isVoucherForm && values.category !== 'Semua Kategori' && (!productsPayload || productsPayload.length === 0)) {
        toast({
            title: "Tidak Ada Produk",
            description: "Tidak ada produk dalam kategori yang dipilih untuk diberi diskon.",
            variant: "destructive"
        });
        setIsSubmitting(false);
        return;
    }

    const groupData: Omit<DiscountGroup, 'id' | 'productCount'> = {
        name: values.name,
        category: values.category,
        channel: values.channel,
        voucherCode: values.voucherCode,
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to.toISOString(),
        products: productsPayload as DiscountedProduct[],
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxUses: values.maxUses,
        minPurchase: values.minPurchase,
    };

    try {
        if (isEditMode) {
            await editDiscountGroup(existingGroup.id, groupData);
            toast({ title: "Promosi Diperbarui", description: `"${values.name}" telah berhasil diperbarui.` });
        } else {
            await addDiscountGroup(groupData);
            toast({ title: "Promosi Dibuat", description: `Promosi "${values.name}" telah berhasil dibuat.` });
        }
        router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups');
    } catch (error) {
        console.error("Failed to save discount group:", error);
        toast({
            title: "Error",
            description: "Gagal menyimpan promosi. Silakan coba lagi.",
            variant: "destructive"
        })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{isVoucherForm ? "Detail Voucher" : "Detail Grup Diskon"}</CardTitle>
            <CardDescription>
              Atur detail dasar untuk promosi Anda, seperti nama, kanal, dan durasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama {isVoucherForm ? 'Voucher' : 'Grup Diskon'}</FormLabel>
                    <FormControl>
                      <Input placeholder={isVoucherForm ? "cth. Voucher Gajian" : "cth. Diskon Kilat Lebaran"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kanal Penjualan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kanal penjualan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="online">Online (Shopee, Tiktok, etc)</SelectItem>
                        <SelectItem value="pos">POS (Point of Sale)</SelectItem>
                        <SelectItem value="reseller">Reseller</SelectItem>
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
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kategori Produk</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori untuk diskon" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Semua Kategori">Semua Kategori</SelectItem>
                            {categories.map((category) => (
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
               {isVoucherForm && <FormField
                control={form.control}
                name="voucherCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Voucher</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. LEBARAN2024" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormDescription>Kode voucher harus unik.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />}
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Pengaturan Diskon</CardTitle>
                    <CardDescription>
                      Atur jenis dan besaran diskon yang akan diterapkan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Jenis Diskon</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis diskon" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="percentage">Potongan Persen (%)</SelectItem>
                                <SelectItem value="fixed">Potongan Harga Tetap (Rp)</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nilai Diskon</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="cth. 10 atau 15000" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="minPurchase"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pembelian Minimum (Opsional)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="cth. 100000" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                      <FormField
                        control={form.control}
                        name="maxUses"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Batas Penggunaan (Opsional)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="cth. 100" {...field} />
                            </FormControl>
                             <FormDescription>
                                Kosongkan untuk penggunaan tanpa batas.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Durasi {isVoucherForm ? 'Voucher' : 'Diskon'}</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full md:w-[300px] justify-start text-left font-normal",
                                !field.value.from && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.from ? (
                                field.value.to ? (
                                <>
                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                    {format(field.value.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(field.value.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pilih rentang tanggal</span>
                            )}
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
          </CardContent>
          <CardFooter className="justify-end gap-2 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups')} disabled={isSubmitting}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t.common.saving : (isEditMode ? "Simpan Perubahan" : (isVoucherForm ? "Buat Voucher" : "Buat Grup Diskon"))}
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

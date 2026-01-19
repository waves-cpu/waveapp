
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
import { CalendarIcon, Edit, Eye, Store, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { DiscountGroup, DiscountedProduct, InventoryItem, InventoryItemVariant } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  products: z.array(discountedProductSchema).optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  discountValue: z.coerce.number().min(0, "Nilai diskon harus diisi.").optional(),
  maxUses: z.coerce.number().optional(),
  minPurchase: z.coerce.number().optional(),
}).refine(data => {
    // Make discountType and discountValue required only for vouchers
    if (data.voucherCode) { // Simplified check
        return !!data.discountType && data.discountValue !== undefined;
    }
    return true;
}, {
    message: "Jenis dan nilai diskon harus diisi untuk voucher.",
    path: ["discountType"],
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
  const [bulkPrice, setBulkPrice] = useState<number | ''>('');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        category: '',
        channel: '',
        voucherCode: '',
        dateRange: { from: new Date(), to: addDays(new Date(), 7) },
        products: [],
        discountType: undefined,
        discountValue: undefined,
        maxUses: undefined,
        minPurchase: undefined,
    }, 
  });
  
  const { reset } = form;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (existingGroup) {
      const formValues = {
        ...existingGroup,
        dateRange: {
          from: new Date(existingGroup.startDate),
          to: new Date(existingGroup.endDate),
        },
        products: existingGroup.products || [],
        discountType: existingGroup.discountType || undefined,
        discountValue: existingGroup.discountValue || undefined,
      };
      reset(formValues);
    }
  }, [existingGroup, reset]);

  
  const { fields, replace } = useFieldArray({
      control: form.control,
      name: "products"
  });
  
  const selectedCategory = form.watch('category');

  const populateProductsByCategory = useCallback((category: string) => {
        const productsInCategory = items.filter(item => item.category === category && !item.isArchived);
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
                    discountedProducts.push({
                        ...baseProductInfo,
                        variantId: Number(variant.id),
                        variantName: variant.name,
                        sku: variant.sku,
                        originalPrice: variant.price,
                        discountedPrice: variant.price,
                    });
                });
            } else {
                discountedProducts.push({
                    ...baseProductInfo,
                    originalPrice: product.price ?? null,
                    discountedPrice: product.price || 0,
                });
            }
        });
        replace(discountedProducts);
  }, [items, replace]);


  useEffect(() => {
    if (isEditMode && isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    if (!isVoucherForm && selectedCategory && selectedCategory !== 'Semua Kategori') {
        populateProductsByCategory(selectedCategory);
    } else if (!isVoucherForm) {
        replace([]);
    }
  }, [selectedCategory, isEditMode, isVoucherForm, populateProductsByCategory, replace]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
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

  const applyBulkPrice = () => {
    if (typeof bulkPrice === 'number' && bulkPrice >= 0) {
        fields.forEach((field, index) => {
            form.setValue(`products.${index}.discountedPrice`, bulkPrice, { shouldDirty: true });
        });
        toast({
            title: 'Harga Diterapkan',
            description: `Harga diskon massal ${bulkPrice.toLocaleString('id-ID')} telah diterapkan ke semua produk.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Harga Tidak Valid',
            description: 'Silakan masukkan angka yang valid untuk harga.',
        });
    }
  };

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
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                        }} value={field.value} defaultValue={field.value}>
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
                     {isVoucherForm && <FormDescription>Kode voucher harus unik.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />}
            </div>
            
            {isVoucherForm && (
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                    <Input type="number" placeholder="cth. 10 atau 15000" {...field} value={field.value ?? ''} />
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
                                    <Input type="number" placeholder="cth. 100000" {...field} value={field.value ?? ''} />
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
                                    <Input type="number" placeholder="cth. 100" {...field} value={field.value ?? ''} />
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
            )}

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
                                !field.value?.from && "text-muted-foreground"
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
            
            {!isVoucherForm && selectedCategory && selectedCategory !== 'Semua Kategori' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Produk Diskon</CardTitle>
                        <CardDescription>Atur harga diskon untuk setiap produk dalam kategori '{selectedCategory}'.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center gap-2 mb-4">
                            <Input
                                type="number"
                                placeholder="Masukkan harga massal"
                                value={bulkPrice}
                                onChange={(e) => setBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-9"
                            />
                            <Button type="button" variant="outline" onClick={applyBulkPrice}>
                                Terapkan ke Semua
                            </Button>
                        </div>
                       <ScrollArea className="h-96 border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background">
                                <TableRow>
                                    <TableHead className="w-[50%]">Produk</TableHead>
                                    <TableHead>Harga Asli</TableHead>
                                    <TableHead>Harga Diskon</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.length > 0 ? fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                 <Image src={field.imageUrl || 'https://placehold.co/40x40.png'} alt={field.productName} width={32} height={32} className="rounded-sm" />
                                                 <div>
                                                    <p className="font-medium text-sm">{field.productName}</p>
                                                    <p className="text-xs text-muted-foreground">{field.variantName || 'Produk utama'}</p>
                                                 </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-muted-foreground line-through">
                                                {field.originalPrice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(field.originalPrice) : 'N/A'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.discountedPrice`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormControl>
                                                        <Input type="number" {...field} className="h-8" />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                                />
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">Tidak ada produk dalam kategori ini.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                       </ScrollArea>
                    </CardContent>
                </Card>
            )}

          </CardContent>
          <CardFooter className="justify-end gap-2 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups')} disabled={isSubmitting}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting || (isEditMode && !form.formState.isDirty)}>
                  {isSubmitting ? t.common.saving : (isEditMode ? "Simpan Perubahan" : (isVoucherForm ? "Buat Voucher" : "Buat Grup Diskon"))}
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

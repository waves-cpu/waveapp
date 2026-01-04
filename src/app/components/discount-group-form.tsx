

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Percent, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DiscountGroup, DiscountedProduct } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import Image from 'next/image';
import { Pagination } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';

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
  products: z.array(discountedProductSchema).nonempty({ message: 'Harus ada setidaknya satu produk dalam grup diskon.' }),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  discountValue: z.coerce.number().optional(),
  maxUses: z.coerce.number().optional(),
  minPurchase: z.coerce.number().optional(),
}).refine(data => {
    if (data.voucherCode) {
        return data.discountType && (data.discountValue !== undefined && data.discountValue > 0);
    }
    return true;
}, {
    message: "Jenis dan nilai diskon harus diisi untuk voucher.",
    path: ["discountValue"],
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [bulkDiscountType, setBulkDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [bulkDiscountValue, setBulkDiscountValue] = useState<number | ''>('');
  
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

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "products"
  });
  
  const selectedCategory = form.watch('category');
  const showVoucherFields = isVoucherForm || !!form.watch('voucherCode');

  useEffect(() => {
    setCurrentPage(1); // Reset page when category changes
  }, [selectedCategory]);

  useEffect(() => {
      if(selectedCategory) {
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
          replace(discountedProducts);
      } else {
          replace([]);
      }
  }, [selectedCategory, items, replace, existingGroup]);
  
  const totalPages = Math.ceil(fields.length / itemsPerPage);

  const paginatedFields = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return fields.slice(startIndex, endIndex).map((field, index) => ({
      ...field,
      originalIndex: startIndex + index, // Keep track of the original index in the `fields` array
    }));
  }, [fields, currentPage, itemsPerPage]);


  const handleApplyBulkDiscount = () => {
    if (bulkDiscountValue === '') return;

    paginatedFields.forEach(field => {
        const originalPrice = field.originalPrice;
        if (originalPrice === null) return; // Skip if no original price
        
        let newPrice = 0;

        if (bulkDiscountType === 'fixed') {
            newPrice = bulkDiscountValue as number;
        } else { // percentage
            newPrice = originalPrice - (originalPrice * (bulkDiscountValue as number) / 100);
        }

        form.setValue(`products.${field.originalIndex}.discountedPrice`, Math.max(0, newPrice));
    });
    toast({ title: "Harga Massal Diterapkan", description: `Harga diskon untuk produk di halaman ini telah diatur.` });
  };
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const groupData: Omit<DiscountGroup, 'id' | 'productCount'> = {
        name: values.name,
        category: values.category,
        channel: values.channel,
        voucherCode: values.voucherCode,
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to.toISOString(),
        products: values.products.filter(p => p.originalPrice !== null) as DiscountedProduct[], // Filter out items with no price
        discountType: values.discountType,
        discountValue: values.discountValue,
        maxUses: values.maxUses,
        minPurchase: values.minPurchase,
    };

    try {
        if (isEditMode) {
            await editDiscountGroup(existingGroup.id, groupData);
            toast({ title: "Grup Diskon Diperbarui", description: `"${values.name}" telah berhasil diperbarui.` });
        } else {
            await addDiscountGroup(groupData);
            toast({ title: "Grup Diskon Dibuat", description: `Grup diskon "${values.name}" telah berhasil dibuat.` });
        }
        router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups');
    } catch (error) {
        console.error("Failed to save discount group:", error);
        toast({
            title: "Error",
            description: "Gagal menyimpan grup diskon. Silakan coba lagi.",
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
          <CardContent className="pt-6 space-y-6">
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
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
               <FormField
                control={form.control}
                name="voucherCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Voucher</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. LEBARAN2024" {...field} disabled={isVoucherForm && !isEditMode} />
                    </FormControl>
                    {isVoucherForm && <FormDescription>Kode voucher harus unik.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showVoucherFields && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Pengaturan Diskon Voucher</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        </div>
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
            
            {selectedCategory && (
                <div>
                     <h3 className="text-lg font-medium mb-2">Atur Harga Diskon</h3>
                     <p className="text-sm text-muted-foreground mb-4">Masukkan harga diskon untuk produk di bawah. Harga asli ditampilkan sebagai referensi.</p>

                    <Card className="mb-4">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                            <Label className="md:w-1/4">Atur Harga Massal</Label>
                            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Select value={bulkDiscountType} onValueChange={(v) => setBulkDiscountType(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Harga Tetap (Rp)</SelectItem>
                                        <SelectItem value="percent">Potongan (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input 
                                    type="number" 
                                    placeholder="Masukkan nilai" 
                                    value={bulkDiscountValue}
                                    onChange={(e) => setBulkDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <Button type="button" onClick={handleApplyBulkDiscount} disabled={bulkDiscountValue === '' || fields.length === 0}>
                                    Terapkan ke Halaman
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[45%]">Produk</TableHead>
                                    <TableHead className="w-[25%]">Harga Asli</TableHead>
                                    <TableHead className="w-[30%]">Harga Diskon</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedFields.length > 0 ? paginatedFields.map((field) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                             <div className="flex items-center gap-4">
                                                <Image 
                                                    src={field.imageUrl || 'https://placehold.co/40x40.png'} 
                                                    alt={field.productName} 
                                                    width={40} height={40} 
                                                    className="rounded-sm"
                                                    data-ai-hint="product image"
                                                />
                                                <div>
                                                    <p className="font-medium">{field.productName}</p>
                                                    {field.variantName && <p className="text-sm text-muted-foreground">{field.variantName}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-muted-foreground line-through">
                                                {field.originalPrice !== null && field.originalPrice !== undefined
                                                  ? field.originalPrice.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                                                  : '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                             <FormField
                                                control={form.control}
                                                name={`products.${field.originalIndex}.discountedPrice`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input type="number" placeholder="cth. 99000" {...formField} disabled={field.originalPrice === null} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                                />
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">Pilih kategori untuk menampilkan produk.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </div>
                      <FormMessage className="mt-2">{form.formState.errors.products?.message}</FormMessage>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                             <div className="text-sm text-muted-foreground">
                                Menampilkan {paginatedFields.length} dari {fields.length} produk.
                             </div>
                             <div className="flex items-center gap-4">
                                <Pagination 
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                                <Select
                                    value={`${itemsPerPage}`}
                                    onValueChange={(value) => {
                                        setItemsPerPage(Number(value))
                                        setCurrentPage(1)
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[150px]">
                                        <SelectValue placeholder={itemsPerPage} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 50].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            Tampilkan {pageSize}
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>
                      )}
                </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups')} disabled={isSubmitting}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                  {isSubmitting ? t.common.saving : (isEditMode ? "Simpan Perubahan" : (isVoucherForm ? "Buat Voucher" : "Buat Grup Diskon"))}
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

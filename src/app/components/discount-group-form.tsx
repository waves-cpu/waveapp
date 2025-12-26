
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { InventoryItem, DiscountGroup, DiscountedProduct } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { addDays } from 'date-fns';
import { DateRange } from "react-day-picker";
import Image from 'next/image';

const discountedProductSchema = z.object({
  productId: z.number(),
  variantId: z.number().optional(),
  productName: z.string(),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  imageUrl: z.string().optional(),
  originalPrice: z.number(),
  discountedPrice: z.coerce.number().min(0, "Harga harus non-negatif."),
});

const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: 'Nama grup diskon minimal 2 karakter.' }),
  category: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  dateRange: z.object({
      from: z.date({ required_error: "Tanggal mulai harus diisi." }),
      to: z.date({ required_error: "Tanggal berakhir harus diisi." }),
  }),
  products: z.array(discountedProductSchema).nonempty({ message: 'Harus ada setidaknya satu produk dalam grup diskon.' }),
});

interface DiscountGroupFormProps {
    existingGroup?: DiscountGroup;
}

export function DiscountGroupForm({ existingGroup }: DiscountGroupFormProps) {
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
    } : {
      name: '',
      category: '',
      dateRange: { from: new Date(), to: addDays(new Date(), 7) },
      products: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "products"
  });
  
  const selectedCategory = form.watch('category');

  useEffect(() => {
      if(selectedCategory) {
          const productsInCategory = items.filter(item => item.category === selectedCategory && !item.isArchived);
          const discountedProducts: DiscountedProduct[] = [];
          
          productsInCategory.forEach(product => {
              if (product.variants && product.variants.length > 0) {
                  product.variants.forEach(variant => {
                      const existingDiscount = existingGroup?.products.find(p => p.variantId === Number(variant.id));
                      discountedProducts.push({
                          productId: Number(product.id),
                          variantId: Number(variant.id),
                          productName: product.name,
                          variantName: variant.name,
                          sku: variant.sku,
                          imageUrl: product.imageUrl,
                          originalPrice: variant.price,
                          discountedPrice: existingDiscount?.discountedPrice ?? variant.price,
                      });
                  });
              } else {
                  const existingDiscount = existingGroup?.products.find(p => p.productId === Number(product.id));
                  discountedProducts.push({
                      productId: Number(product.id),
                      productName: product.name,
                      sku: product.sku,
                      imageUrl: product.imageUrl,
                      originalPrice: product.price || 0,
                      discountedPrice: existingDiscount?.discountedPrice ?? (product.price || 0),
                  });
              }
          });
          replace(discountedProducts);
      } else {
          replace([]);
      }
  }, [selectedCategory, items, replace, existingGroup]);
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const groupData: Omit<DiscountGroup, 'id' | 'productCount'> = {
        name: values.name,
        category: values.category,
        startDate: values.dateRange.from.toISOString(),
        endDate: values.dateRange.to.toISOString(),
        products: values.products,
    };

    try {
        if (isEditMode) {
            await editDiscountGroup(existingGroup.id, groupData);
            toast({ title: "Grup Diskon Diperbarui", description: `"${values.name}" telah berhasil diperbarui.` });
        } else {
            await addDiscountGroup(groupData);
            toast({ title: "Grup Diskon Dibuat", description: `Grup diskon "${values.name}" telah berhasil dibuat.` });
        }
        router.push('/finance/discounts');
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
                    <FormLabel>Nama Grup Diskon</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Diskon Kilat Lebaran" {...field} />
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
            <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Durasi Diskon</FormLabel>
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
                                {fields.map((field, index) => (
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
                                                {field.originalPrice.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                             <FormField
                                                control={form.control}
                                                name={`products.${index}.discountedPrice`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input type="number" placeholder="cth. 99000" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                                />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                      <FormMessage className="mt-2">{form.formState.errors.products?.message}</FormMessage>
                </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push('/finance/discounts')} disabled={isSubmitting}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                  {isSubmitting ? t.common.saving : (isEditMode ? "Simpan Perubahan" : "Buat Grup Diskon")}
              </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}


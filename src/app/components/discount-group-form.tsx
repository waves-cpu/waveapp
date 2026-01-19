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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { DiscountGroup, DiscountedProduct, InventoryItem } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

// Schema for the main details form
const detailsSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: 'Nama grup diskon minimal 2 karakter.' }),
  channel: z.string().min(1, { message: 'Kanal penjualan harus dipilih.' }),
  dateRange: z.object({
      from: z.date({ required_error: "Tanggal mulai harus diisi." }),
      to: z.date({ required_error: "Tanggal berakhir harus diisi." }),
  }),
});

// Schema for the pricing form
const pricingSchema = z.object({
    products: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        productName: z.string(),
        variantName: z.string().optional(),
        sku: z.string().optional(),
        imageUrl: z.string().optional(),
        originalPrice: z.number().nullable(),
        discountedPrice: z.coerce.number().min(0, "Harga harus non-negatif."),
    })),
});


interface DiscountGroupEditorProps {
    existingGroup: DiscountGroup;
}

export function DiscountGroupForm({ existingGroup }: DiscountGroupEditorProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { editDiscountGroup, items } = useInventory();
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [isSavingPrices, setIsSavingPrices] = useState(false);
    const [bulkPrice, setBulkPrice] = useState<number | ''>('');
    
    // Form for Details Card
    const detailsForm = useForm<z.infer<typeof detailsSchema>>({
        resolver: zodResolver(detailsSchema),
        defaultValues: {
            id: existingGroup.id,
            name: existingGroup.name,
            channel: existingGroup.channel,
            dateRange: {
                from: new Date(existingGroup.startDate),
                to: new Date(existingGroup.endDate),
            }
        }
    });
    
    // Form for Pricing Card
    const pricingForm = useForm<z.infer<typeof pricingSchema>>({
        resolver: zodResolver(pricingSchema),
        defaultValues: {
            products: []
        }
    });

    const { fields, replace } = useFieldArray({
        control: pricingForm.control,
        name: "products"
    });

    // Effect to populate the pricing form when the component mounts
    useEffect(() => {
        const productsInCategory = items.filter(item => item.category === existingGroup.category && !item.isArchived);
        const productList: DiscountedProduct[] = [];

        productsInCategory.forEach(product => {
            const baseProductInfo = {
                productId: Number(product.id),
                productName: product.name,
                sku: product.sku,
                imageUrl: product.imageUrl,
            };

            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const existingDiscount = existingGroup.products.find(p => p.variantId === Number(variant.id));
                    productList.push({
                        ...baseProductInfo,
                        variantId: Number(variant.id),
                        variantName: variant.name,
                        sku: variant.sku,
                        originalPrice: variant.price,
                        discountedPrice: existingDiscount ? existingDiscount.discountedPrice : variant.price,
                    });
                });
            } else {
                 const existingDiscount = existingGroup.products.find(p => p.productId === Number(product.id) && !p.variantId);
                 productList.push({
                    ...baseProductInfo,
                    originalPrice: product.price ?? null,
                    discountedPrice: existingDiscount ? existingDiscount.discountedPrice : (product.price || 0),
                });
            }
        });
        
        replace(productList);

    }, [items, existingGroup, replace]);


    async function onSaveDetails(values: z.infer<typeof detailsSchema>) {
        setIsSavingDetails(true);
        const groupData: Omit<DiscountGroup, 'id' | 'productCount'> = {
            ...existingGroup, // keep existing products
            name: values.name,
            channel: values.channel,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to.toISOString(),
        };

        try {
            await editDiscountGroup(existingGroup.id, groupData);
            toast({ title: "Detail Diperbarui", description: "Nama, kanal, dan tanggal telah disimpan." });
            detailsForm.reset(values); // Re-sync isDirty
        } catch (error) {
            toast({ title: "Gagal Menyimpan", variant: "destructive" });
        } finally {
            setIsSavingDetails(false);
        }
    }
    
    async function onSavePrices(values: z.infer<typeof pricingSchema>) {
        setIsSavingPrices(true);
        const groupData: Omit<DiscountGroup, 'id' | 'productCount'> = {
            ...existingGroup, // keep existing details
            name: detailsForm.getValues('name'),
            channel: detailsForm.getValues('channel'),
            startDate: detailsForm.getValues('dateRange.from').toISOString(), 
            endDate: detailsForm.getValues('dateRange.to').toISOString(),
            products: values.products.filter(p => p.originalPrice !== null) as DiscountedProduct[],
        };

        try {
            await editDiscountGroup(existingGroup.id, groupData);
            toast({ title: "Harga Diskon Disimpan", description: "Harga diskon untuk semua produk telah diperbarui." });
            pricingForm.reset(values); // Re-sync isDirty
        } catch (error) {
            toast({ title: "Gagal Menyimpan Harga", variant: "destructive" });
        } finally {
            setIsSavingPrices(false);
        }
    }

    const applyBulkPrice = () => {
        if (typeof bulkPrice === 'number' && bulkPrice >= 0) {
            fields.forEach((_, index) => {
                pricingForm.setValue(`products.${index}.discountedPrice`, bulkPrice, { shouldDirty: true });
            });
            toast({ title: 'Harga Diterapkan', description: 'Harga diskon massal telah diterapkan ke semua produk.' });
        } else {
            toast({ variant: 'destructive', title: 'Harga Tidak Valid' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Details Form Card */}
            <Form {...detailsForm}>
                <form onSubmit={detailsForm.handleSubmit(onSaveDetails)}>
                     <Card>
                          <CardHeader>
                            <CardTitle>Detail Grup Diskon</CardTitle>
                            <CardDescription>Ubah detail dasar untuk promosi ini. Kategori tidak dapat diubah setelah grup dibuat.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={detailsForm.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nama Grup Diskon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={detailsForm.control} name="channel" render={({ field }) => (
                                    <FormItem><FormLabel>Kanal Penjualan</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="pos">POS</SelectItem></SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )}/>
                             </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Kategori Produk</Label>
                                    <Input value={existingGroup.category} disabled />
                                    <FormDescription>Kategori tidak dapat diubah.</FormDescription>
                                </div>
                                <FormField control={detailsForm.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Durasi Diskon</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild><FormControl><Button id="date" variant={"outline"} className={cn("justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>Pilih rentang tanggal</span>)}
                                            </Button></FormControl></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value} onSelect={field.onChange} numberOfMonths={2}/></PopoverContent>
                                        </Popover><FormMessage/>
                                    </FormItem>
                                )}/>
                              </div>
                          </CardContent>
                          <CardFooter className="justify-end border-t pt-6">
                             <Button type="submit" disabled={isSavingDetails || !detailsForm.formState.isDirty}>
                                {isSavingDetails ? 'Menyimpan...' : 'Simpan Detail'}
                             </Button>
                          </CardFooter>
                     </Card>
                </form>
            </Form>

            {/* Pricing Form Card */}
            <Form {...pricingForm}>
                <form onSubmit={pricingForm.handleSubmit(onSavePrices)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Pengaturan Harga Produk</CardTitle>
                            <CardDescription>Atur harga diskon untuk setiap produk dalam kategori '{existingGroup.category}'.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="flex items-center gap-2 mb-4">
                                <Input type="number" placeholder="Masukkan harga massal" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value === '' ? '' : Number(e.target.value))} className="h-9"/>
                                <Button type="button" variant="outline" onClick={applyBulkPrice}>Terapkan ke Semua</Button>
                           </div>
                           <ScrollArea className="h-96 border rounded-md">
                               <Table>
                                   <TableHeader className="sticky top-0 bg-background"><TableRow><TableHead className="w-[50%]">Produk</TableHead><TableHead>Harga Asli</TableHead><TableHead>Harga Diskon</TableHead></TableRow></TableHeader>
                                   <TableBody>
                                       {fields.length > 0 ? fields.map((field, index) => (
                                           <TableRow key={field.id}><TableCell>
                                               <div className="flex items-center gap-3">
                                                    <Image src={field.imageUrl || 'https://placehold.co/40x40.png'} alt={field.productName} width={32} height={32} className="rounded-sm" />
                                                    <div><p className="font-medium text-sm">{field.productName}</p><p className="text-xs text-muted-foreground">{field.variantName || 'Produk utama'}</p></div>
                                               </div>
                                           </TableCell><TableCell>
                                               <p className="text-sm text-muted-foreground line-through">{field.originalPrice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(field.originalPrice) : 'N/A'}</p>
                                           </TableCell><TableCell>
                                               <FormField control={pricingForm.control} name={`products.${index}.discountedPrice`} render={({ field }) => (
                                                   <FormItem><FormControl><Input type="number" {...field} className="h-8" /></FormControl><FormMessage /></FormItem>
                                               )}/>
                                           </TableCell></TableRow>
                                       )) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">Tidak ada produk dalam kategori ini.</TableCell></TableRow>)}
                                   </TableBody>
                               </Table>
                           </ScrollArea>
                        </CardContent>
                        <CardFooter className="justify-end border-t pt-6">
                            <Button type="submit" disabled={isSavingPrices || !pricingForm.formState.isDirty}>
                                {isSavingPrices ? 'Menyimpan...' : 'Simpan Semua Harga'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}

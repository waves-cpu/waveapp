

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
import { CalendarIcon, PlusCircle, Pencil, Trash2, ChevronDown, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { DiscountGroup, DiscountedProduct, InventoryItem } from '@/types';
import { categories } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from "@/components/ui/label";
import { ProductSelectionDialog } from './product-selection-dialog';
import { Separator } from '@/components/ui/separator';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: 'Nama grup diskon minimal 2 karakter.' }),
  category: z.string().min(1, { message: "Kategori harus dipilih." }),
  channel: z.string().min(1, { message: 'Kanal penjualan harus dipilih.' }),
  dateRange: z.object({
      from: z.date({ required_error: "Tanggal mulai harus diisi." }),
      to: z.date({ required_error: "Tanggal berakhir harus diisi." }),
  }),
  voucherCode: z.string().optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  discountValue: z.coerce.number().optional(),
  maxUses: z.coerce.number().int().optional(),
  minPurchase: z.coerce.number().optional(),
  products: z.array(z.object({
      productId: z.number(),
      variantId: z.number().optional(),
      productName: z.string(),
      variantName: z.string().optional(),
      sku: z.string().optional(),
      imageUrl: z.string().optional(),
      originalPrice: z.number().nullable(),
      discountedPrice: z.coerce.number({ invalid_type_error: 'Harga harus angka.' }).min(0, "Harga harus non-negatif."),
  })),
});

interface DiscountGroupEditorProps {
    existingGroup?: DiscountGroup;
    isVoucherForm: boolean;
}

export function DiscountGroupForm({ existingGroup, isVoucherForm }: DiscountGroupEditorProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { addDiscountGroup, editDiscountGroup, items, discountGroups } = useInventory();
    const [isSaving, setIsSaving] = useState(false);
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false);
    const isEditMode = !!existingGroup;
    const [globalBulkPrice, setGlobalBulkPrice] = useState<number | ''>('');
    const [masterPrices, setMasterPrices] = useState<Record<string, number | ''>>({});


    const getProductsForForm = useCallback((products: any[]): any[] => {
        return products.map(p => {
             const parent = items.find(i => i.id === p.productId.toString());
            
            if (p.variantId) {
                const variant = parent?.variants?.find(v => v.id === p.variantId.toString());
                return {
                    productId: p.productId,
                    variantId: p.variantId,
                    productName: parent?.name || 'Unknown Product',
                    variantName: variant?.name || 'Unknown Variant',
                    sku: variant?.sku || '',
                    imageUrl: parent?.imageUrl || '',
                    originalPrice: variant?.price || 0,
                    discountedPrice: p.discountedPrice
                };
            } else {
                 return {
                    productId: p.productId,
                    variantId: undefined,
                    productName: parent?.name || 'Unknown Product',
                    variantName: undefined,
                    sku: parent?.sku || '',
                    imageUrl: parent?.imageUrl || '',
                    originalPrice: parent?.price || 0,
                    discountedPrice: p.discountedPrice
                };
            }
        });
    }, [items]);

    const defaultDetails = useMemo(() => {
        if (!isEditMode || !existingGroup) {
            return {
                name: '',
                category: '',
                channel: 'online',
                dateRange: {
                    from: new Date(),
                    to: addDays(new Date(), 7),
                },
                products: [],
                voucherCode: '',
                discountType: 'percentage' as const,
                discountValue: 10,
                maxUses: undefined,
                minPurchase: 0,
            };
        }

        const finalProductList = getProductsForForm(existingGroup.products || []);

        return {
            id: existingGroup.id,
            name: existingGroup.name,
            category: existingGroup.category,
            channel: existingGroup.channel,
            dateRange: {
                from: new Date(existingGroup.startDate),
                to: new Date(existingGroup.endDate),
            },
            products: finalProductList,
            voucherCode: existingGroup.voucherCode || '',
            discountType: existingGroup.discountType || 'percentage',
            discountValue: existingGroup.discountValue || undefined,
            maxUses: existingGroup.maxUses === null ? undefined : existingGroup.maxUses,
            minPurchase: existingGroup.minPurchase || 0,
        };
    }, [isEditMode, existingGroup, getProductsForForm]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultDetails,
    });
    
    useEffect(() => {
        if (existingGroup) {
            form.reset(defaultDetails);
        }
    }, [existingGroup, defaultDetails, form]);


    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "products"
    });

    const selectedCategory = form.watch('category');
    const selectedChannel = form.watch('channel');
    
    const handleSelectProducts = useCallback((selectedIds: string[]) => {
        const productList: Omit<DiscountedProduct, 'originalPrice'> & { originalPrice: number | null, discountedPrice: number }[] = [];

        const currentProductAndVariantIds = new Set(fields.map(f => f.variantId ? f.variantId.toString() : f.productId.toString()));
        const uniqueSelectedItemIds = Array.from(new Set(selectedIds));

        uniqueSelectedItemIds.forEach(selectedId => {
            if (currentProductAndVariantIds.has(selectedId)) return;

            for (const product of items) {
                 if (product.variants && product.variants.length > 0) {
                    const variant = product.variants.find(v => v.id === selectedId);
                    if (variant) {
                        productList.push({
                            productId: Number(product.id),
                            productName: product.name,
                            sku: product.sku,
                            imageUrl: product.imageUrl,
                            variantId: Number(variant.id),
                            variantName: variant.name,
                            originalPrice: variant.price,
                            discountedPrice: variant.price,
                        });
                        return;
                    }
                } else if (product.id === selectedId) {
                    if (product.price !== null && product.price !== undefined) {
                         productList.push({
                            productId: Number(product.id),
                            productName: product.name,
                            sku: product.sku,
                            imageUrl: product.imageUrl,
                            originalPrice: product.price,
                            discountedPrice: product.price,
                        });
                    }
                    return;
                }
            }
        });

        if (productList.length > 0) {
            append(productList);
        }
    }, [items, fields, append]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        const { dateRange, ...rest } = values;
        const groupData = { 
            ...rest,
            startDate: dateRange.from.toISOString(),
            endDate: dateRange.to.toISOString(),
            products: values.products.filter(p => p.originalPrice !== null)
        };

        try {
            if (isEditMode) {
                await editDiscountGroup(values.id!, groupData);
                toast({ title: "Perubahan Disimpan", description: "Detail diskon/voucher telah berhasil diperbarui." });
            } else {
                await addDiscountGroup(groupData);
                toast({ title: "Berhasil Dibuat", description: "Diskon/voucher baru telah berhasil dibuat." });
            }
            router.push(isVoucherForm ? '/promotions/vouchers' : '/promotions/discount-groups');
        } catch (error) {
            toast({ title: "Gagal Menyimpan", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    const applyGlobalBulkPrice = () => {
        const priceValue = typeof globalBulkPrice === 'string' ? parseFloat(globalBulkPrice) : globalBulkPrice;
        if (typeof priceValue === 'number' && priceValue >= 0) {
            fields.forEach((_, index) => {
                form.setValue(`products.${index}.discountedPrice`, priceValue, { shouldDirty: true });
            });
            toast({ title: 'Harga Massal Diterapkan' });
        } else {
            toast({ variant: 'destructive', title: 'Harga Tidak Valid' });
        }
    };
    
    const applyMasterPrice = (productId: number) => {
        const priceValue = masterPrices[productId.toString()];
        const price = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;
        if (typeof price === 'number' && price >= 0) {
            fields.forEach((field, index) => {
                if (field.productId === productId) {
                    form.setValue(`products.${index}.discountedPrice`, price, { shouldDirty: true });
                }
            });
        }
    };
    
    const availableItemsForSelection = useMemo(() => items.filter(i => i.category === selectedCategory), [items, selectedCategory]);

    const groupedProducts = useMemo(() => {
        const groups: Record<string, {
            productId: number;
            productName: string;
            sku?: string;
            imageUrl?: string;
            variants: (typeof fields[0] & { originalIndex: number })[];
        }> = {};

        fields.forEach((field, index) => {
            const { productId } = field;
            if (!groups[productId]) {
                const parent = items.find(i => i.id === productId.toString());
                groups[productId] = {
                    productId: productId,
                    productName: parent?.name || field.productName,
                    sku: parent?.sku,
                    imageUrl: parent?.imageUrl,
                    variants: [],
                };
            }
            groups[productId].variants.push({ ...field, originalIndex: index });
        });

        return Object.values(groups).sort((a,b) => a.productName.localeCompare(b.productName));
    }, [fields, items]);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return groupedProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [groupedProducts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(groupedProducts.length / itemsPerPage);

    const handleRemoveGroup = (group: { variants: { originalIndex: number }[] }) => {
        const indicesToRemove = group.variants.map(v => v.originalIndex).sort((a, b) => b - a);
        remove(indicesToRemove);
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                     <Card>
                          <CardHeader className="p-6">
                            <CardTitle className="text-base">{isEditMode ? 'Ubah Detail' : 'Detail Baru'}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nama {isVoucherForm ? 'Voucher' : 'Grup Diskon'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem><FormLabel>Kategori Produk</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isEditMode}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori produk..."/></SelectTrigger></FormControl>
                                            <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                        </Select>
                                        {isEditMode && <FormDescription>Kategori tidak dapat diubah setelah grup dibuat.</FormDescription>}
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <FormField control={form.control} name="channel" render={({ field }) => (
                                    <FormItem><FormLabel>Kanal Penjualan</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="online">Online (Shopee, Tiktok, dll.)</SelectItem>
                                                <SelectItem value="pos">POS (Toko Fisik)</SelectItem>
                                                <SelectItem value="reseller">Reseller</SelectItem>
                                            </SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Durasi</FormLabel>
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
                               {isVoucherForm && (
                                   <>
                                     <Separator />
                                     <h3 className="text-lg font-medium">Detail Voucher</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="voucherCode" render={({ field }) => (
                                            <FormItem><FormLabel>Kode Voucher</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="discountType" render={({ field }) => (
                                            <FormItem><FormLabel>Tipe Diskon</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Persentase (%)</SelectItem>
                                                        <SelectItem value="fixed">Potongan Tetap (Rp)</SelectItem>
                                                    </SelectContent>
                                                </Select><FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="discountValue" render={({ field }) => (
                                            <FormItem><FormLabel>Nilai Diskon</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                         <FormField control={form.control} name="maxUses" render={({ field }) => (
                                            <FormItem><FormLabel>Batas Penggunaan (Opsional)</FormLabel><FormControl><Input type="number" placeholder="Kosongkan untuk tanpa batas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                         <FormField control={form.control} name="minPurchase" render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormLabel>Minimum Belanja (Opsional)</FormLabel><FormControl><Input type="number" placeholder="cth. 100000" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                     </div>
                                   </>
                               )}
                          </CardContent>
                     </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Pengaturan Harga Produk</CardTitle>
                            <CardDescription>Atur harga diskon untuk produk dalam kategori '{selectedCategory || "..."}'.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex justify-between items-center mb-6">
                                <Button type="button" onClick={() => setProductSelectorOpen(true)} disabled={!selectedCategory}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Pilih Produk
                                </Button>
                                {groupedProducts.length > 1 && (
                                     <div className="flex items-center justify-center pt-4">
                                         <div className="flex items-center gap-2 w-full max-w-sm">
                                             <Input
                                                 id="global-bulk-price"
                                                 type="number"
                                                 placeholder="Ubah Harga"
                                                 className="h-9 flex-grow"
                                                 value={globalBulkPrice}
                                                 onChange={(e) => setGlobalBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                             />
                                             <Button type="button" size="sm" variant="secondary" onClick={applyGlobalBulkPrice}>Terapkan ke Semua</Button>
                                         </div>
                                     </div>
                                )}
                            </div>
                               <Table>
                                   <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Produk</TableHead>
                                        <TableHead className="w-[15%]">Harga Asli</TableHead>
                                        <TableHead className="w-[15%]">Harga Diskon</TableHead>
                                        <TableHead className="w-[15%]">Diskon</TableHead>
                                        <TableHead className="w-[15%] text-right">Aksi</TableHead>
                                    </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                        {paginatedGroups.length > 0 ? paginatedGroups.map((group) => {
                                            if (group.variants.length === 1 && !isEditMode) {
                                                const field = group.variants[0];
                                                const originalIndex = field.originalIndex;
                                                const displayName = field.variantName ? `${field.productName} - ${field.variantName}` : field.productName;
                                                const displaySku = field.sku || group.sku || 'N/A';
                                                const displayImageUrl = field.imageUrl || group.imageUrl || 'https://placehold.co/40x40.png';

                                                return (
                                                    <TableRow key={field.productId}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Image src={displayImageUrl} alt={displayName} width={32} height={32} className="rounded-sm" />
                                                                <div>
                                                                    <p className="font-medium text-sm">{displayName}</p>
                                                                    <p className="text-xs text-muted-foreground">SKU: {displaySku}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-sm text-muted-foreground line-through">{field.originalPrice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(field.originalPrice) : 'N/A'}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField control={form.control} name={`products.${originalIndex}.discountedPrice`} render={({ field: formField }) => (
                                                                <FormItem><FormControl><Input type="number" {...formField} onChange={e => formField.onChange(Number(e.target.value))} className="h-8 w-32" /></FormControl><FormMessage /></FormItem>
                                                            )}/>
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const discountedPriceValue = form.watch(`products.${originalIndex}.discountedPrice`);
                                                                const discountedPrice = Number(discountedPriceValue);
                                                                const originalPrice = field.originalPrice;
                                                                if (originalPrice && originalPrice > 0 && !isNaN(discountedPrice) && discountedPrice < originalPrice) {
                                                                    const discountPercentage = ((originalPrice - discountedPrice) / originalPrice) * 100;
                                                                    if (discountPercentage > 0) {
                                                                        return <Badge variant="destructive">{Math.round(discountPercentage)}%</Badge>;
                                                                    }
                                                                }
                                                                return null;
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(originalIndex)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }
                                            return (
                                                <React.Fragment key={group.productId}>
                                                    <TableRow className="bg-muted/20 hover:bg-muted/40 font-semibold">
                                                         <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Image src={group.imageUrl || 'https://placehold.co/40x40.png'} alt={group.productName} width={32} height={32} className="rounded-sm" />
                                                                <div>
                                                                    <p className="text-sm text-primary">{group.productName}</p>
                                                                    <p className="text-xs text-muted-foreground font-normal">SKU: {group.sku}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell colSpan={2} className="py-1">
                                                            <div className="flex items-center gap-2 w-full max-w-sm">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Ubah harga"
                                                                    className="h-9 flex-grow"
                                                                    value={masterPrices[group.productId.toString()] ?? ''}
                                                                    onChange={e => setMasterPrices(prev => ({...prev, [group.productId.toString()]: e.target.value === '' ? '' : Number(e.target.value)}))}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-1">
                                                             <Button type="button" size="sm" variant="secondary" onClick={() => applyMasterPrice(group.productId)}>Terapkan</Button>
                                                        </TableCell>
                                                        <TableCell className="py-1 text-right">
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8" onClick={() => handleRemoveGroup(group)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.variants.map((field) => {
                                                        const originalIndex = field.originalIndex;
                                                        return (
                                                            <TableRow key={field.variantId}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3 pl-1">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-sm shrink-0">
                                                                            <Store className="h-5 w-5 text-gray-400" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-medium text-sm">{field.variantName}</p>
                                                                            <p className="text-xs text-muted-foreground">{field.sku}</p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <p className="text-sm text-muted-foreground line-through">{field.originalPrice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(field.originalPrice) : 'N/A'}</p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <FormField control={form.control} name={`products.${originalIndex}.discountedPrice`} render={({ field: formField }) => (
                                                                        <FormItem><FormControl><Input type="number" {...formField} onChange={e => formField.onChange(Number(e.target.value))} className="h-8 w-32" /></FormControl><FormMessage /></FormItem>
                                                                    )}/>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {(() => {
                                                                        const discountedPriceValue = form.watch(`products.${originalIndex}.discountedPrice`);
                                                                        const discountedPrice = Number(discountedPriceValue);
                                                                        const originalPrice = field.originalPrice;
                                                                        if (originalPrice && originalPrice > 0 && !isNaN(discountedPrice) && discountedPrice < originalPrice) {
                                                                            const discountPercentage = ((originalPrice - discountedPrice) / originalPrice) * 100;
                                                                            if (discountPercentage > 0) {
                                                                                return <Badge variant="destructive">{Math.round(discountPercentage)}%</Badge>;
                                                                            }
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(originalIndex)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        }) : (<TableRow><TableCell colSpan={5} className="h-24 text-center">Pilih kategori untuk menambahkan produk.</TableCell></TableRow>)}
                                   </TableBody>
                               </Table>
                        </CardContent>
                        {totalPages > 1 && (
                            <CardFooter>
                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                            </CardFooter>
                        )}
                    </Card>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSaving}>Batal</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Buat & Simpan')}
                        </Button>
                    </div>
                </form>
            </Form>
             <ProductSelectionDialog 
                open={isProductSelectorOpen}
                onOpenChange={setProductSelectorOpen}
                onSelect={handleSelectProducts}
                availableItems={availableItemsForSelection}
                initialSelectedIds={new Set(fields.map(f => f.variantId?.toString() || f.productId.toString()))}
                title="Pilih Produk untuk Diskon"
                description={`Pilih produk dari kategori "${selectedCategory}" untuk ditambahkan ke grup diskon ini.`}
                discountGroups={discountGroups || []}
                formChannel={selectedChannel}
                editingGroupId={existingGroup?.id}
            />
        </>
    );
}

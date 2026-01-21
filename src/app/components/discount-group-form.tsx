
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
import { CalendarIcon, PlusCircle, Pencil, Trash2 } from 'lucide-react';
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
      discountedPrice: z.coerce.number().min(0, "Harga harus non-negatif."),
  })),
});

interface DiscountGroupEditorProps {
    existingGroup?: DiscountGroup;
    isVoucherForm: boolean;
}

export function DiscountGroupForm({ existingGroup, isVoucherForm }: DiscountGroupEditorProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { addDiscountGroup, editDiscountGroup, items } = useInventory();
    const [isSaving, setIsSaving] = useState(false);
    const [isProductSelectorOpen, setProductSelectorOpen] = useState(false);
    const isEditMode = !!existingGroup;
    const [groupBulkPrices, setGroupBulkPrices] = useState<Record<string, number | ''>>({});

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
                discountType: 'percentage',
                discountValue: 10,
                maxUses: undefined,
                minPurchase: 0,
            };
        }
        return {
            id: existingGroup.id,
            name: existingGroup.name,
            category: existingGroup.category,
            channel: existingGroup.channel,
            dateRange: {
                from: new Date(existingGroup.startDate),
                to: new Date(existingGroup.endDate),
            },
            products: existingGroup.products,
            voucherCode: existingGroup.voucherCode || '',
            discountType: existingGroup.discountType || 'percentage',
            discountValue: existingGroup.discountValue || undefined,
            maxUses: existingGroup.maxUses === null ? undefined : existingGroup.maxUses,
            minPurchase: existingGroup.minPurchase || 0,
        };
    }, [isEditMode, existingGroup]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultDetails,
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "products"
    });

    const selectedCategory = form.watch('category');

    const getProductsForForm = useCallback((productsToAdd: InventoryItem[], selectedIds: Set<string>) => {
        const productList: Omit<DiscountedProduct, 'originalPrice'> & { originalPrice: number | null, discountedPrice: number }[] = [];

        productsToAdd.forEach(product => {
            const baseProductInfo = {
                productId: Number(product.id),
                productName: product.name,
                sku: product.sku,
                imageUrl: product.imageUrl,
            };

            const existingProductInForm = fields.find(f => f.productId === Number(product.id));

            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    if (selectedIds.has(variant.id)) {
                        const existingVariantInForm = existingProductInForm?.variantId === Number(variant.id) ? existingProductInForm : undefined;
                        productList.push({
                            ...baseProductInfo,
                            variantId: Number(variant.id),
                            variantName: variant.name,
                            sku: variant.sku,
                            originalPrice: variant.price,
                            discountedPrice: existingVariantInForm ? existingVariantInForm.discountedPrice : variant.price,
                        });
                    }
                });
            } else {
                 if (selectedIds.has(product.id)) {
                    if (product.price === null || product.price === undefined) return;
                    productList.push({
                        ...baseProductInfo,
                        originalPrice: product.price ?? null,
                        discountedPrice: existingProductInForm ? existingProductInForm.discountedPrice : (product.price || 0),
                    });
                }
            }
        });
        return productList;
    }, [fields]);

    useEffect(() => {
        if (isEditMode && existingGroup?.products) {
            const productsToAdd = items.filter(item => existingGroup.products.some(p => p.productId === Number(item.id)));
            const selectedIds = new Set(existingGroup.products.map(p => p.variantId ? p.variantId.toString() : p.productId.toString()));
            const productListForForm = getProductsForForm(productsToAdd, selectedIds);
            
            // Map existing prices
            const finalProductList = productListForForm.map(p => {
                const existing = existingGroup.products.find(ep => (p.variantId && ep.variantId === p.variantId) || (!p.variantId && ep.productId === p.productId));
                return existing ? { ...p, discountedPrice: existing.discountedPrice } : p;
            });

            replace(finalProductList);
        }
    }, [defaultDetails, form, isEditMode, existingGroup, replace, getProductsForForm, items]);
    
    const handleSelectProducts = (selectedItemIds: string[]) => {
        const selectedIdsSet = new Set(selectedItemIds);
        const itemsToAdd = items.filter(item => {
            if (selectedIdsSet.has(item.id)) return true;
            return item.variants?.some(v => selectedIdsSet.has(v.id));
        });
        
        const newProducts = getProductsForForm(itemsToAdd, selectedIdsSet);
        
        const currentProductAndVariantIds = new Set(fields.map(f => f.variantId ? f.variantId.toString() : f.productId.toString()));
        const productsToAppend = newProducts.filter(p => !currentProductAndVariantIds.has(p.variantId?.toString() || p.productId.toString()));

        append(productsToAppend);
    };

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
    
    const handleGroupBulkPriceChange = (productId: string, value: string) => {
        setGroupBulkPrices(prev => ({
            ...prev,
            [productId]: value === '' ? '' : Number(value)
        }));
    };

    const applyGroupBulkPrice = (productId: string) => {
        const price = groupBulkPrices[productId];
        if (typeof price === 'number' && price >= 0) {
            const indicesToUpdate: number[] = [];
            fields.forEach((field, index) => {
                if (field.productId.toString() === productId) {
                    indicesToUpdate.push(index);
                }
            });

            indicesToUpdate.forEach(index => {
                form.setValue(`products.${index}.discountedPrice`, price, { shouldDirty: true });
            });
            toast({ title: 'Harga Varian Diterapkan' });
        } else {
            toast({ variant: 'destructive', title: 'Harga Tidak Valid' });
        }
    };
    
    const availableItemsForSelection = useMemo(() => items.filter(i => i.category === selectedCategory), [items, selectedCategory]);

    const groupedProducts = useMemo(() => {
        const groups: Record<string, {
            productId: number;
            productName: string;
            sku?: string;
            imageUrl?: string;
            isSimpleProduct: boolean;
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
                    isSimpleProduct: false,
                    variants: [],
                };
            }
            groups[productId].variants.push({ ...field, originalIndex: index });
        });
        
        Object.values(groups).forEach(group => {
            group.isSimpleProduct = group.variants.length === 1 && !group.variants[0].variantId;
        });

        return Object.values(groups);
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
                          <CardHeader>
                            <CardTitle>{isEditMode ? 'Ubah Detail' : 'Detail Baru'}</CardTitle>
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
                        <CardHeader className="flex-row justify-between items-center">
                            <div>
                                <CardTitle>Pengaturan Harga Produk</CardTitle>
                                <CardDescription>Atur harga diskon untuk produk dalam kategori '{selectedCategory || "..."}'.</CardDescription>
                            </div>
                             {!isVoucherForm && (
                                <Button type="button" onClick={() => setProductSelectorOpen(true)} disabled={!selectedCategory}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Pilih Produk
                                </Button>
                             )}
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="border rounded-md">
                               <Table>
                                   <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        <TableHead className="w-[50%]">Produk</TableHead>
                                        <TableHead>Harga Asli</TableHead>
                                        <TableHead>Harga Diskon</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                        {paginatedGroups.length > 0 ? paginatedGroups.map((group) => {
                                            if (group.isSimpleProduct) {
                                                const field = group.variants[0];
                                                const originalIndex = field.originalIndex;
                                                return (
                                                    <TableRow key={field.productId}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Image src={field.imageUrl || 'https://placehold.co/40x40.png'} alt={field.productName} width={32} height={32} className="rounded-sm" />
                                                                <div>
                                                                    <p className="font-medium text-sm">{field.productName}</p>
                                                                    <p className="text-xs text-muted-foreground">SKU: {field.sku || 'Produk utama'}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-sm text-muted-foreground line-through">{field.originalPrice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(field.originalPrice) : 'N/A'}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField control={form.control} name={`products.${originalIndex}.discountedPrice`} render={({ field }) => (
                                                                <FormItem><FormControl><Input type="number" {...field} className="h-8" /></FormControl><FormMessage /></FormItem>
                                                            )}/>
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
                                                        <TableCell colSpan={2}>
                                                             <div className="flex items-center gap-3">
                                                                <Image src={group.imageUrl || 'https://placehold.co/40x40.png'} alt={group.productName} width={32} height={32} className="rounded-sm" />
                                                                <div>
                                                                    <p className="text-sm text-primary">{group.productName}</p>
                                                                    <p className="text-xs text-muted-foreground font-normal">SKU: {group.sku}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                         <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="Harga Massal" 
                                                                    className="h-8 bg-background"
                                                                    value={groupBulkPrices[group.productId.toString()] ?? ''}
                                                                    onChange={(e) => handleGroupBulkPriceChange(group.productId.toString(), e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <Button 
                                                                    type="button" 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-8"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        applyGroupBulkPrice(group.productId.toString())
                                                                    }}
                                                                >
                                                                    Terapkan
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleRemoveGroup(group)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.variants.map((field) => {
                                                        const originalIndex = field.originalIndex;
                                                        return (
                                                            <TableRow key={field.variantId}>
                                                                <TableCell className="pl-12">
                                                                    <div className="flex items-center gap-3">
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
                                                                    <FormField control={form.control} name={`products.${originalIndex}.discountedPrice`} render={({ field }) => (
                                                                        <FormItem><FormControl><Input type="number" {...field} className="h-8" /></FormControl><FormMessage /></FormItem>
                                                                    )}/>
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
                                        }) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Pilih kategori untuk menambahkan produk.</TableCell></TableRow>)}
                                   </TableBody>
                               </Table>
                           </ScrollArea>
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
                categories={[]}
                initialSelectedIds={new Set(fields.map(f => f.variantId?.toString() || f.productId.toString()))}
                title="Pilih Produk untuk Diskon"
                description={`Pilih produk dari kategori "${selectedCategory}" untuk ditambahkan ke grup diskon ini.`}
            />
        </>
    );
}

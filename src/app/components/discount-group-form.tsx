

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
import { CalendarIcon, PlusCircle, Pencil, Trash2, ChevronDown, Store, Search } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';


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
    const [productSearch, setProductSearch] = useState('');
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());


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
    
    const getItemId = (product: { productId: number; variantId?: number }) => {
        return product.variantId?.toString() || product.productId.toString();
    };

    const handleSelectProducts = useCallback((selectedIds: string[]) => {
        const newProductList: (Omit<DiscountedProduct, 'originalPrice'> & { originalPrice: number | null, discountedPrice: number, productId: number })[] = [];

        const uniqueSelectedIds = new Set(selectedIds);
        
        const existingFormProducts = new Map<string, any>();
        fields.forEach(field => {
            const id = getItemId(field);
            existingFormProducts.set(id, field);
        });

        uniqueSelectedIds.forEach(selectedId => {
            if (existingFormProducts.has(selectedId)) {
                newProductList.push(existingFormProducts.get(selectedId));
                return;
            }
            
            for (const product of items) {
                if (product.variants && product.variants.length > 0) {
                    const variant = product.variants.find(v => v.id === selectedId);
                    if (variant) {
                        newProductList.push({
                            productId: Number(product.id),
                            variantId: Number(variant.id),
                            productName: product.name,
                            variantName: variant.name,
                            sku: variant.sku || '',
                            imageUrl: product.imageUrl || '',
                            originalPrice: variant.price,
                            discountedPrice: variant.price,
                        });
                        return;
                    }
                } else if (product.id === selectedId) {
                     if (product.price !== null && product.price !== undefined) {
                        newProductList.push({
                            productId: Number(product.id),
                            variantId: undefined,
                            productName: product.name,
                            variantName: undefined,
                            sku: product.sku,
                            imageUrl: product.imageUrl || '',
                            originalPrice: product.price,
                            discountedPrice: product.price,
                        });
                    }
                    return;
                }
            }
        });

        replace(newProductList);
    }, [items, fields, replace]);


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
        if (bulkSelectedIds.size === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada produk dipilih",
                description: "Silakan pilih produk menggunakan checkbox untuk menerapkan harga massal."
            });
            return;
        }

        const priceValue = typeof globalBulkPrice === 'string' ? parseFloat(globalBulkPrice) : globalBulkPrice;
        if (typeof priceValue === 'number' && priceValue >= 0) {
            fields.forEach((_, index) => {
                const field = form.getValues(`products.${index}`);
                const fieldId = getItemId(field);

                if (bulkSelectedIds.has(fieldId)) {
                    form.setValue(`products.${index}.discountedPrice`, priceValue, { shouldDirty: true });
                }
            });
            toast({ title: 'Harga Massal Diterapkan', description: `Harga baru telah diterapkan pada ${bulkSelectedIds.size} item.` });
            setBulkSelectedIds(new Set());
            setGlobalBulkPrice('');
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
    
    const filteredGroupedProducts = useMemo(() => {
        if (!productSearch) return groupedProducts;
        const lowercasedSearch = productSearch.toLowerCase();
        return groupedProducts.filter(group => {
            const parentMatch = group.productName.toLowerCase().includes(lowercasedSearch) || (group.sku && group.sku.toLowerCase().includes(lowercasedSearch));
            if (parentMatch) return true;
            const variantMatch = group.variants.some(variant => 
                variant.productName.toLowerCase().includes(lowercasedSearch) ||
                (variant.variantName && variant.variantName.toLowerCase().includes(lowercasedSearch)) ||
                (variant.sku && variant.sku.toLowerCase().includes(lowercasedSearch))
            );
            return variantMatch;
        });
    }, [groupedProducts, productSearch]);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [productSearch]);

    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredGroupedProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredGroupedProducts, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredGroupedProducts.length / itemsPerPage);

    const handleRemoveGroup = (group: { variants: { originalIndex: number }[] }) => {
        const indicesToRemove = group.variants.map(v => v.originalIndex).sort((a, b) => b - a);
        remove(indicesToRemove);
    };

    const paginatedItemIds = useMemo(() => {
        return paginatedGroups.flatMap(group => group.variants.map(v => getItemId(v)));
    }, [paginatedGroups]);

    const handleSelectAllOnPage = (checked: boolean) => {
        const newSelectedIds = new Set(bulkSelectedIds);
        if (checked) {
            paginatedItemIds.forEach(id => newSelectedIds.add(id));
        } else {
            paginatedItemIds.forEach(id => newSelectedIds.delete(id));
        }
        setBulkSelectedIds(newSelectedIds);
    };

    const handleSelectGroup = (variants: any[], checked: boolean) => {
        const newSelectedIds = new Set(bulkSelectedIds);
        const idsToToggle = variants.map(v => getItemId(v));
        if (checked) {
            idsToToggle.forEach(id => newSelectedIds.add(id));
        } else {
            idsToToggle.forEach(id => newSelectedIds.delete(id));
        }
        setBulkSelectedIds(newSelectedIds);
    };

    const handleSelectOne = (itemId: string, checked: boolean) => {
        const newSelectedIds = new Set(bulkSelectedIds);
        if (checked) {
            newSelectedIds.add(itemId);
        } else {
            newSelectedIds.delete(itemId);
        }
        setBulkSelectedIds(newSelectedIds);
    };

    const isPageAllSelected = paginatedItemIds.length > 0 && paginatedItemIds.every(id => bulkSelectedIds.has(id));
    const isPagePartiallySelected = paginatedItemIds.some(id => bulkSelectedIds.has(id)) && !isPageAllSelected;


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
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
                                <div>
                                    <Button type="button" onClick={() => setProductSelectorOpen(true)} disabled={!selectedCategory}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Pilih Produk
                                    </Button>
                                </div>
                                <div className="relative md:col-span-1">
                                    <Label htmlFor="product-search" className="sr-only">Cari produk</Label>
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="product-search"
                                        placeholder="Cari produk dalam daftar..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="pl-8 h-9"
                                    />
                                </div>
                                <div className="flex items-center gap-2 md:col-span-1">
                                    <div className="flex-grow">
                                        <Label htmlFor="global-bulk-price" className="sr-only">Ubah harga massal</Label>
                                        <Input
                                            id="global-bulk-price"
                                            type="number"
                                            placeholder="Ubah Harga"
                                            className="h-9"
                                            value={globalBulkPrice}
                                            onChange={(e) => setGlobalBulkPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                    </div>
                                    <Button type="button" size="sm" variant="secondary" onClick={applyGlobalBulkPrice} className="shrink-0">
                                        Terapkan ({bulkSelectedIds.size})
                                    </Button>
                                </div>
                            </div>
                               <Table>
                                   <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                             <Checkbox
                                                checked={isPageAllSelected ? true : isPagePartiallySelected ? 'indeterminate' : false}
                                                onCheckedChange={(checked) => handleSelectAllOnPage(!!checked)}
                                                aria-label="Select all on this page"
                                            />
                                        </TableHead>
                                        <TableHead className="w-[40%]">Produk</TableHead>
                                        <TableHead className="w-[15%]">Harga Asli</TableHead>
                                        <TableHead className="w-[15%]">Harga Diskon</TableHead>
                                        <TableHead className="w-[15%]">Diskon</TableHead>
                                        <TableHead className="w-[10%] text-right">Aksi</TableHead>
                                    </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                        {paginatedGroups.length > 0 ? paginatedGroups.map((group) => {
                                            const variantIds = group.variants.map(v => getItemId(v));
                                            const selectedCount = variantIds.filter(id => bulkSelectedIds.has(id)).length;
                                            const isAllSelected = selectedCount > 0 && selectedCount === variantIds.length;
                                            const isPartiallySelected = selectedCount > 0 && !isAllSelected;

                                            return (
                                                <React.Fragment key={group.productId}>
                                                    <TableRow className="bg-muted/20 hover:bg-muted/40 font-semibold">
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={isAllSelected ? true : (isPartiallySelected ? 'indeterminate' : false)}
                                                                onCheckedChange={(checked) => handleSelectGroup(group.variants, !!checked)}
                                                            />
                                                        </TableCell>
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
                                                        const fieldId = getItemId(field);
                                                        return (
                                                            <TableRow key={field.variantId}>
                                                                 <TableCell>
                                                                    <Checkbox
                                                                        checked={bulkSelectedIds.has(fieldId)}
                                                                        onCheckedChange={(checked) => handleSelectOne(fieldId, !!checked)}
                                                                    />
                                                                </TableCell>
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
                                        }) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">Pilih kategori untuk menambahkan produk.</TableCell></TableRow>)}
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
                initialSelectedIds={new Set(fields.map(f => getItemId(f)))}
                title="Pilih Produk untuk Diskon"
                description={`Pilih produk dari kategori "${selectedCategory}" untuk ditambahkan ke grup diskon ini.`}
                discountGroups={discountGroups || []}
                formChannel={selectedChannel}
                editingGroupId={existingGroup?.id}
            />
        </>
    );
}

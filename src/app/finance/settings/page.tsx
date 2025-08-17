
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useInventory } from "@/hooks/use-inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { InventoryItem, InventoryItemVariant } from "@/types";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type FormValues = {
  items: {
    id: string;
    type: 'product' | 'variant';
    costPrice?: number;
    defaultPrice?: number;
    posPrice?: number;
    shopeePrice?: number;
    lazadaPrice?: number;
    tiktokPrice?: number;
    resellerPrice?: number;
  }[];
};

const CHANNELS = ['pos', 'shopee', 'lazada', 'tiktok', 'reseller'];

export default function FinanceSettingsPage() {
    const { items, loading, updatePrices, fetchItems } = useInventory();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const flattenedItems = useMemo(() => {
        return items.flatMap(item => {
            if (item.variants && item.variants.length > 0) {
                return [
                    { ...item, isParent: true },
                    ...item.variants.map(v => ({ ...v, parentName: item.name, parentSku: item.sku, parentImageUrl: item.imageUrl, isParent: false }))
                ];
            }
            return { ...item, isParent: false };
        });
    }, [items]);

    const { control, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: { items: [] }
    });

    const { fields } = useFieldArray({
        control,
        name: "items"
    });

    useEffect(() => {
        if (!loading && items.length > 0) {
            const formItems = items.flatMap(item => {
                const productEntry = !item.variants || item.variants.length === 0 ? [{
                    id: item.id,
                    type: 'product' as const,
                    costPrice: item.costPrice,
                    defaultPrice: item.price,
                    posPrice: item.channelPrices?.find(p => p.channel === 'pos')?.price,
                    shopeePrice: item.channelPrices?.find(p => p.channel === 'shopee')?.price,
                    lazadaPrice: item.channelPrices?.find(p => p.channel === 'lazada')?.price,
                    tiktokPrice: item.channelPrices?.find(p => p.channel === 'tiktok')?.price,
                    resellerPrice: item.channelPrices?.find(p => p.channel === 'reseller')?.price,
                }] : [];

                const variantEntries = item.variants?.map(v => ({
                    id: v.id,
                    type: 'variant' as const,
                    costPrice: v.costPrice,
                    defaultPrice: v.price,
                    posPrice: v.channelPrices?.find(p => p.channel === 'pos')?.price,
                    shopeePrice: v.channelPrices?.find(p => p.channel === 'shopee')?.price,
                    lazadaPrice: v.channelPrices?.find(p => p.channel === 'lazada')?.price,
                    tiktokPrice: v.channelPrices?.find(p => p.channel === 'tiktok')?.price,
                    resellerPrice: v.channelPrices?.find(p => p.channel === 'reseller')?.price,
                })) || [];

                return [...productEntry, ...variantEntries];
            });
            reset({ items: formItems });
        }
    }, [items, loading, reset]);

    const itemMap = useMemo(() => {
        const map = new Map<string, InventoryItem | InventoryItemVariant & { parentName?: string, parentImageUrl?: string }>();
        items.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                 item.variants.forEach(v => map.set(v.id, { ...v, parentName: item.name, parentImageUrl: item.imageUrl }));
            } else {
                map.set(item.id, item);
            }
        });
        return map;
    }, [items]);

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        const priceUpdates = data.items.map(item => ({
            id: item.id,
            type: item.type,
            costPrice: item.costPrice,
            defaultPrice: item.defaultPrice,
            channelPrices: CHANNELS.map(channel => ({
                channel,
                price: (item as any)[`${channel}Price`]
            })).filter(cp => cp.price !== undefined && cp.price !== null && cp.price !== '')
        }));

        try {
            await updatePrices(priceUpdates);
            await fetchItems(); // Re-fetch to confirm changes
            toast({
                title: "Harga Diperbarui",
                description: "Semua perubahan harga telah berhasil disimpan.",
            });
        } catch (error) {
            console.error("Failed to update prices:", error);
            toast({
                title: "Gagal Memperbarui Harga",
                description: "Terjadi kesalahan saat menyimpan perubahan.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-bold">Pengaturan Harga</h1>
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                        </Button>
                    </div>
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Produk</TableHead>
                                    <TableHead>Harga Modal</TableHead>
                                    <TableHead>Harga Jual Default</TableHead>
                                    <TableHead>Harga Jual POS</TableHead>
                                    <TableHead>Harga Jual Shopee</TableHead>
                                    <TableHead>Harga Jual Lazada</TableHead>
                                    <TableHead>Harga Jual Tiktok</TableHead>
                                    <TableHead>Harga Jual Reseller</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                            {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-9 w-full" /></TableCell>)}
                                        </TableRow>
                                    ))
                                ) : (
                                    fields.map((field, index) => {
                                        const item = itemMap.get(field.id);
                                        if (!item) return null;
                                        const isVariant = 'parentName' in item;

                                        return (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {isVariant ? (
                                                             <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                                <Store className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                        ) : (
                                                            <Image 
                                                                src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                                                alt={item.name} 
                                                                width={40} height={40} 
                                                                className="rounded-sm" 
                                                                data-ai-hint="product image"
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-sm">{isVariant ? item.parentName : item.name}</div>
                                                            <div className="text-xs text-muted-foreground">{isVariant ? item.name : `SKU: ${item.sku || 'N/A'}`}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.costPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga modal" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.defaultPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga jual" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.posPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga POS" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.shopeePrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga Shopee" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.lazadaPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga Lazada" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.tiktokPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga Tiktok" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.resellerPrice`}
                                                        control={control}
                                                        render={({ field }) => <Input type="number" placeholder="Harga Reseller" {...field} value={field.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}

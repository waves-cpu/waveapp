
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
import { Store, PlusCircle, ShoppingBag, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { ProductSelectionDialog } from "@/app/components/product-selection-dialog";

type PriceFormItem = {
  id: string; 
  type: 'product' | 'variant';
  costPrice?: number | string;
  defaultPrice?: number | string;
  posPrice?: number | string;
  shopeePrice?: number | string;
  lazadaPrice?: number | string;
  tiktokPrice?: number | string;
  resellerPrice?: number | string;
};

type FormValues = {
  items: PriceFormItem[];
};

const CHANNELS = ['pos', 'shopee', 'lazada', 'tiktok', 'reseller'];

export default function FinanceSettingsPage() {
    const { items: allInventoryItems, loading, updatePrices, categories } = useInventory();
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language];
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSelectionDialogOpen, setSelectionDialogOpen] = useState(false);

    const { control, handleSubmit, formState: { isDirty }, reset } = useForm<FormValues>({
        defaultValues: { items: [] }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    const itemMap = useMemo(() => {
        const map = new Map<string, InventoryItem | InventoryItemVariant & { parentName?: string, parentImageUrl?: string, parentSku?: string }>();
        allInventoryItems.forEach(item => {
            if (item.variants && item.variants.length > 0) {
                 item.variants.forEach(v => map.set(v.id, { ...v, parentName: item.name, parentImageUrl: item.imageUrl, parentSku: item.sku }));
            } else if (item.stock !== undefined) {
                map.set(item.id, item);
            }
        });
        return map;
    }, [allInventoryItems]);

    const handleProductsSelected = (selectedIds: string[]) => {
      const newItemsToAppend = selectedIds
        .filter(id => !fields.some(field => field.id === id)) // Prevent duplicates
        .map(id => {
          const item = itemMap.get(id);
          if (!item) return null;
          const isVariant = 'productId' in item;
          
          const channelPrices = (item.channelPrices || []).reduce((acc, cp) => {
              acc[`${cp.channel}Price`] = cp.price;
              return acc;
          }, {} as {[key: string]: number});
          
          return {
              id: item.id,
              type: isVariant ? 'variant' as const : 'product' as const,
              costPrice: item.costPrice ?? '',
              defaultPrice: item.price ?? '',
              ...channelPrices
          };
        }).filter((item): item is PriceFormItem => item !== null);
      
      append(newItemsToAppend);
    };

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        const priceUpdates = data.items.map(item => ({
            id: item.id,
            type: item.type,
            costPrice: item.costPrice !== '' && item.costPrice !== undefined ? Number(item.costPrice) : undefined,
            defaultPrice: item.defaultPrice !== '' && item.defaultPrice !== undefined ? Number(item.defaultPrice) : undefined,
            channelPrices: CHANNELS.map(channel => ({
                channel,
                price: (item as any)[`${channel}Price`]
            })).filter(cp => cp.price !== undefined && cp.price !== null && cp.price !== '')
             .map(cp => ({ ...cp, price: Number(cp.price) }))
        }));

        try {
            await updatePrices(priceUpdates);
            toast({
                title: t.priceSettings.toastSuccessTitle,
                description: t.priceSettings.toastSuccessDesc,
            });
            // Reset with current data to clear dirty state
            reset({ items: data.items });
        } catch (error) {
            console.error("Failed to update prices:", error);
            toast({
                title: t.priceSettings.toastErrorTitle,
                description: t.priceSettings.toastErrorDesc,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-bold">{t.finance.priceSettings}</h1>
                        </div>
                        <Button type="button" onClick={() => setSelectionDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            {t.stockInForm.selectProducts}
                        </Button>
                    </div>
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">{t.priceSettings.product}</TableHead>
                                    <TableHead>{t.priceSettings.costPrice}</TableHead>
                                    <TableHead>{t.priceSettings.defaultPrice}</TableHead>
                                    <TableHead>{t.priceSettings.posPrice}</TableHead>
                                    <TableHead>{t.priceSettings.shopeePrice}</TableHead>
                                    <TableHead>{t.priceSettings.lazadaPrice}</TableHead>
                                    <TableHead>{t.priceSettings.tiktokPrice}</TableHead>
                                    <TableHead>{t.priceSettings.resellerPrice}</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && fields.length === 0 ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                            {[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton className="h-9 w-full" /></TableCell>)}
                                        </TableRow>
                                    ))
                                ) : fields.length > 0 ? (
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
                                                        render={({ field: controllerField }) => <Input type="number" placeholder={t.priceSettings.placeholderCost} {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.defaultPrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder={t.priceSettings.placeholderSell} {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.posPrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder="POS" {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.shopeePrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder="Shopee" {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.lazadaPrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder="Lazada" {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.tiktokPrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder="Tiktok" {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                     <Controller
                                                        name={`items.${index}.resellerPrice`}
                                                        control={control}
                                                        render={({ field: controllerField }) => <Input type="number" placeholder="Reseller" {...controllerField} value={controllerField.value ?? ''} className="h-9" />}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <ShoppingBag className="h-16 w-16" />
                                                <div className="text-center">
                                                    <p className="font-semibold">{t.stockInForm.noProducts}</p>
                                                    <p className="text-sm">Silakan pilih produk untuk mengatur harganya.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     {fields.length > 0 && (
                        <div className="flex justify-end mt-6">
                            <Button type="submit" disabled={isSubmitting || !isDirty}>
                                {isSubmitting ? t.common.saveChanges + '...' : t.priceSettings.save}
                            </Button>
                        </div>
                     )}
                </form>
            </main>
        </AppLayout>
        <ProductSelectionDialog 
            open={isSelectionDialogOpen}
            onOpenChange={setSelectionDialogOpen}
            onSelect={handleProductsSelected}
            availableItems={allInventoryItems}
            categories={categories}
        />
        </>
    );
}

'use client';

import { AddProductForm } from "@/app/components/add-product-form";
import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { useInventory } from "@/hooks/use-inventory";
import { translations } from "@/types/language";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { InventoryItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function EditProductPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
            </div>
        </div>
    )
}


export default function EditProductPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const { language } = useLanguage();
    const t = translations[language];
    const params = useParams();
    const { items, loading: inventoryLoading } = useInventory(); 
    const [item, setItem] = useState<InventoryItem | undefined>(undefined);
    const [pageLoading, setPageLoading] = useState(true);

    const id = typeof params.id === 'string' ? params.id : '';

    useEffect(() => {
        if (!inventoryLoading && id) {
            let foundItem: InventoryItem | undefined;
            // The ID could be a parent product or a variant
            foundItem = items.find(i => i.id === id);
            if (!foundItem) {
                // If not found, it might be a variant ID. Find its parent.
                 for (const parentItem of items) {
                    if (parentItem.variants?.some(v => v.id === id)) {
                        foundItem = parentItem;
                        break;
                    }
                }
            }
            setItem(foundItem);
            setPageLoading(false);
        }
    }, [id, items, inventoryLoading]);


    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.inventoryTable.editProduct}</h1>
                    </div>
                    {pageLoading ? (
                        <EditProductPageSkeleton />
                    ) : item ? (
                        <AddProductForm existingItem={item} />
                    ) : (
                        <p>Item not found.</p>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

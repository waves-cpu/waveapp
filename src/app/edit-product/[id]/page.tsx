'use client';

import { AddProductForm } from "@/app/components/add-product-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { useInventory } from "@/hooks/use-inventory";
import { translations } from "@/types/language";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { InventoryItem } from "@/types";

export default function EditProductPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const params = useParams();
    const { getItem } = useInventory();
    const [item, setItem] = useState<InventoryItem | undefined>(undefined);

    const id = typeof params.id === 'string' ? params.id : '';

    useEffect(() => {
        if (id) {
            const fetchedItem = getItem(id);
            if (fetchedItem && !('history' in fetchedItem)) {
                setItem(fetchedItem as InventoryItem);
            } else if (fetchedItem) {
                // If it's a variant, we might want to find the parent to edit,
                // but for now let's handle direct item editing.
                 const foundItem = getItem(id) as InventoryItem;
                 if(foundItem) setItem(foundItem);
            }
        }
    }, [id, getItem]);


    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.inventoryTable.editProduct}</h1>
                </div>
                {item ? (
                    <AddProductForm existingItem={item} />
                ) : (
                    <p>Loading item...</p>
                )}
            </div>
        </main>
    );
}

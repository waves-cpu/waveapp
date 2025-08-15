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
    const { getItem, items } = useInventory(); // Destructure items to find parent
    const [item, setItem] = useState<InventoryItem | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const id = typeof params.id === 'string' ? params.id : '';

    useEffect(() => {
        if (id && items.length > 0) {
            setLoading(true);
            const fetchedItem = getItem(id);
            setItem(fetchedItem);
            setLoading(false);
        }
    }, [id, getItem, items]);


    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.inventoryTable.editProduct}</h1>
                </div>
                {loading ? (
                    <p>Loading item...</p>
                ) : item ? (
                    <AddProductForm existingItem={item} />
                ) : (
                    <p>Item not found.</p>
                )}
            </div>
        </main>
    );
}

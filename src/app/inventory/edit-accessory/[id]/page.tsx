
'use client';

import { EditAccessoryForm } from "@/app/components/edit-accessory-form";
import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { useInventory } from "@/hooks/use-inventory";
import { translations } from "@/types/language";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Accessory } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

function EditAccessoryPageSkeleton() {
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


export default function EditAccessoryPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const params = useParams();
    const { accessories, loading: inventoryLoading } = useInventory(); 
    const [item, setItem] = useState<Accessory | undefined>(undefined);
    const [pageLoading, setPageLoading] = useState(true);

    const id = typeof params.id === 'string' ? params.id : '';

    useEffect(() => {
        if (!inventoryLoading && id) {
            const foundItem = accessories.find(i => i.id === id);
            setItem(foundItem);
            setPageLoading(false);
        }
    }, [id, accessories, inventoryLoading]);


    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.inventoryTable.editProduct}</h1>
                    </div>
                    {pageLoading ? (
                        <EditAccessoryPageSkeleton />
                    ) : item ? (
                        <EditAccessoryForm existingItem={item} />
                    ) : (
                        <p>Aksesoris tidak ditemukan.</p>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

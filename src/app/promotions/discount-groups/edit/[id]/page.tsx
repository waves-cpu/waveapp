'use client';

import { AppLayout } from "@/app/components/app-layout";
import { DiscountGroupForm } from "@/app/components/discount-group-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useInventory } from "@/hooks/use-inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DiscountGroup } from "@/types";

function EditDiscountPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
}

export default function EditDiscountGroupPage() {
    const params = useParams();
    const { getDiscountGroup, loading: inventoryLoading } = useInventory();
    const [group, setGroup] = useState<DiscountGroup | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;

    useEffect(() => {
        if (!inventoryLoading && !isNaN(id)) {
            const fetchGroup = async () => {
                try {
                    const fetchedGroup = await getDiscountGroup(id);
                    setGroup(fetchedGroup);
                } catch (error) {
                    console.error("Failed to fetch discount group:", error);
                    setGroup(null);
                } finally {
                    setPageLoading(false);
                }
            };
            fetchGroup();
        }
    }, [id, inventoryLoading, getDiscountGroup]);

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Ubah Grup Diskon</h1>
                </div>
                <div className="max-w-7xl mx-auto">
                    {pageLoading ? (
                        <EditDiscountPageSkeleton />
                    ) : group ? (
                        <DiscountGroupForm existingGroup={group} isVoucherForm={false} />
                    ) : (
                        <p>Grup diskon tidak ditemukan.</p>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

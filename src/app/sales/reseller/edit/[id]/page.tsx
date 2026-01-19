'use client';

import { AppLayout } from "@/app/components/app-layout";
import { ResellerForm } from "@/app/components/reseller-form";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useInventory } from "@/hooks/use-inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Reseller } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function EditResellerPageSkeleton() {
    return (
        <Card>
             <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
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
            </CardContent>
            <CardFooter className="justify-end">
                <Skeleton className="h-9 w-24" />
            </CardFooter>
        </Card>
    );
}

export default function EditResellerPage() {
    const params = useParams();
    const { getResellerById, loading: inventoryLoading } = useInventory();
    const [reseller, setReseller] = useState<Reseller | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;

    useEffect(() => {
        if (!inventoryLoading && !isNaN(id)) {
            const fetchReseller = async () => {
                try {
                    const fetchedReseller = await getResellerById(id);
                    setReseller(fetchedReseller);
                } catch (error) {
                    console.error("Failed to fetch reseller:", error);
                    setReseller(null);
                } finally {
                    setPageLoading(false);
                }
            };
            fetchReseller();
        }
    }, [id, inventoryLoading, getResellerById]);

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                 <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                </div>
                <div className="max-w-2xl mx-auto">
                    {pageLoading ? (
                        <EditResellerPageSkeleton />
                    ) : reseller ? (
                        <ResellerForm existingReseller={reseller} />
                    ) : (
                        <p>Reseller tidak ditemukan.</p>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

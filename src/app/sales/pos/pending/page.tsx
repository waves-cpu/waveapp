'use client';

import React, { useMemo, useEffect, useCallback } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale } from '@/types';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hourglass } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatToWIB } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type GroupedSale = {
    transactionId: string;
    saleDate: string;
    items: Sale[];
    totalAmount: number;
    totalItems: number;
}

export default function PendingTransactionsPage() {
    const { allSales, fetchItems, loading, loadPendingTransaction } = useInventory();
    const router = useRouter();

    const fetchAllData = useCallback(async () => {
        await fetchItems();
    }, [fetchItems]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const pendingSales = useMemo(() => {
        return allSales.filter(s => s.status === 'Pending' && s.channel === 'pos');
    }, [allSales]);

    const groupedSales = useMemo((): GroupedSale[] => {
        const groups = new Map<string, GroupedSale>();

        pendingSales.forEach(sale => {
            const id = sale.transactionId || `sale-${sale.id}`;

            if (!groups.has(id)) {
                groups.set(id, {
                    transactionId: id,
                    saleDate: sale.saleDate,
                    items: [],
                    totalAmount: 0,
                    totalItems: 0,
                });
            }

            const group = groups.get(id)!;
            group.items.push(sale);
            group.totalAmount += sale.priceAtSale * sale.quantity;
            group.totalItems += sale.quantity;
        });

        return Array.from(groups.values()).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [pendingSales]);

    const handleContinueTransaction = (group: GroupedSale) => {
        loadPendingTransaction(group.items);
        router.push('/sales/pos');
    };

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Transaksi Tertunda</h1>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {loading ? (
                        <p>Memuat...</p>
                    ) : groupedSales.length > 0 ? (
                        groupedSales.map(group => (
                            <Card key={group.transactionId}>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base font-mono">{group.transactionId.slice(-8)}</CardTitle>
                                        <Badge variant="secondary">{formatToWIB(new Date(group.saleDate), 'HH:mm')}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-sm">
                                        <p className="font-medium">{group.items[0]?.productName} {group.items[0]?.variantName || ''}</p>
                                        {group.items.length > 1 && (
                                            <p className="text-xs text-muted-foreground">+ {group.items.length - 1} produk lainnya</p>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Item</p>
                                            <p className="font-bold">{group.totalItems}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Total Belanja</p>
                                            <p className="font-bold text-lg">{group.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</p>
                                        </div>
                                    </div>
                                    <Button className="w-full" onClick={() => handleContinueTransaction(group)}>
                                        Lanjutkan Transaksi
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-background rounded-lg border-2 border-dashed">
                             <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <Hourglass className="h-16 w-16" />
                                <div className="text-center">
                                    <p className="font-semibold text-lg">Tidak Ada Transaksi Tertunda</p>
                                    <p className="text-sm">Mulai transaksi baru di halaman POS.</p>
                                    <Button asChild variant="link" className="mt-2">
                                        <Link href="/sales/pos">Kembali ke POS</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

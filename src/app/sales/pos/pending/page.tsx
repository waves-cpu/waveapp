
'use client';

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale } from '@/types';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hourglass, List, LayoutGrid, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatToWIB } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type GroupedSale = {
    transactionId: string;
    saleDate: string;
    items: Sale[];
    totalAmount: number;
    totalItems: number;
}

export default function PendingTransactionsPage() {
    const { allSales, fetchItems, loading, loadPendingTransaction, cancelSaleTransaction } = useInventory();
    const router = useRouter();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [transactionToCancel, setTransactionToCancel] = useState<GroupedSale | null>(null);

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

    const handleConfirmCancel = useCallback(async () => {
        if (!transactionToCancel) return;
        try {
            await cancelSaleTransaction(transactionToCancel.transactionId);
            toast({
                title: "Transaksi Dihapus",
                description: `Transaksi tertunda #${transactionToCancel.transactionId.slice(-8)} telah dihapus.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Gagal Menghapus",
                description: "Gagal menghapus transaksi tertunda.",
            });
        } finally {
            setTransactionToCancel(null);
        }
    }, [transactionToCancel, cancelSaleTransaction, toast]);


    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Transaksi Tertunda</h1>
                    <div className="ml-auto flex items-center gap-1 rounded-md bg-muted p-1">
                        <Button
                            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setViewMode('card')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <p>Memuat...</p>
                ) : groupedSales.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {groupedSales.map(group => (
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
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button className="w-full" onClick={() => handleContinueTransaction(group)}>
                                            Lanjutkan Transaksi
                                        </Button>
                                        <Button variant="outline" size="icon" className="text-destructive" onClick={() => setTransactionToCancel(group)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Waktu</TableHead>
                                        <TableHead>Detail</TableHead>
                                        <TableHead className="text-center">Total Item</TableHead>
                                        <TableHead className="text-right">Total Belanja</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedSales.map(group => (
                                        <TableRow key={group.transactionId}>
                                            <TableCell className="font-medium">{formatToWIB(new Date(group.saleDate), 'HH:mm:ss')}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{group.items[0]?.productName} {group.items[0]?.variantName || ''}</div>
                                                {group.items.length > 1 && <div className="text-xs text-muted-foreground">+ {group.items.length - 1} produk lainnya</div>}
                                            </TableCell>
                                            <TableCell className="text-center">{group.totalItems}</TableCell>
                                            <TableCell className="text-right font-medium">{group.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" onClick={() => handleContinueTransaction(group)}>Lanjutkan</Button>
                                                <Button variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => setTransactionToCancel(group)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )
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
            </main>
             <AlertDialog open={!!transactionToCancel} onOpenChange={(open) => !open && setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Transaksi Tertunda?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Transaksi #{transactionToCancel?.transactionId.slice(-8)} akan dihapus. Stok yang sudah terpotong akan dikembalikan. Aksi ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

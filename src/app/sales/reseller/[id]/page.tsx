'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Phone, Home, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import type { Reseller, Sale } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatToWIB } from '@/lib/utils';
import { parseISO } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function ResellerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { getResellerById, allSales, loading } = useInventory();
    
    const [reseller, setReseller] = useState<Reseller | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;

    useEffect(() => {
        if (!loading && !isNaN(id)) {
            const fetchReseller = async () => {
                setPageLoading(true);
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
    }, [id, loading, getResellerById]);

    const resellerTransactions = useMemo(() => {
        if (!reseller || !allSales) return [];
        
        const salesByTx = allSales.reduce((acc, sale) => {
            if (sale.resellerId === reseller.id && sale.status === 'Completed' && sale.transactionId) {
                if (!acc[sale.transactionId]) {
                    acc[sale.transactionId] = {
                        transactionId: sale.transactionId,
                        saleDate: sale.saleDate,
                        totalAmount: 0,
                    };
                }
                acc[sale.transactionId].totalAmount += sale.priceAtSale * sale.quantity;
            }
            return acc;
        }, {} as Record<string, { transactionId: string; saleDate: string; totalAmount: number }>);
        
        return Object.values(salesByTx).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [reseller, allSales]);

    const totalOmzet = useMemo(() => {
        return resellerTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    }, [resellerTransactions]);

    if (pageLoading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="grid gap-6 md:grid-cols-3">
                        <Skeleton className="h-48 md:col-span-1" />
                        <Skeleton className="h-96 md:col-span-2" />
                    </div>
                </main>
            </AppLayout>
        )
    }

    if (!reseller) {
        return (
            <AppLayout>
                 <main className="flex-1 p-4 md:p-10">
                    <p>Reseller tidak ditemukan.</p>
                </main>
            </AppLayout>
        )
    }


    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                 <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/sales/reseller')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">Detail Reseller</h1>
                            <p className="text-sm text-muted-foreground">{reseller.name}</p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={`/sales/reseller/edit/${reseller.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Ubah Data
                        </Link>
                    </Button>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informasi Kontak</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-start">
                                    <Phone className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
                                    <span>{reseller.phone || 'Tidak ada no. telepon'}</span>
                                </div>
                                 <div className="flex items-start">
                                    <Home className="h-4 w-4 mr-3 mt-1 text-muted-foreground" />
                                    <span>{reseller.address || 'Tidak ada alamat'}</span>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Ringkasan Penjualan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Total Transaksi</span>
                                    <span className="font-bold text-lg">{resellerTransactions.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Total Omzet</span>
                                    <span className="font-bold text-lg">{formatCurrency(totalOmzet)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Riwayat Transaksi</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>ID Transaksi</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resellerTransactions.length > 0 ? (
                                            resellerTransactions.map(tx => (
                                                <TableRow key={tx.transactionId}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {formatToWIB(parseISO(tx.saleDate), 'dd MMM yyyy, HH:mm')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono">{tx.transactionId}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(tx.totalAmount)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    Belum ada transaksi.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </main>
        </AppLayout>
    )
}

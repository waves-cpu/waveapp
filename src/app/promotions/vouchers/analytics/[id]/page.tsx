
'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart2, Ticket, DollarSign, Percent, History } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { DiscountGroup, Sale } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatToWIB } from '@/lib/utils';
import { parseISO } from 'date-fns';

interface VoucherAnalytics {
    voucher: DiscountGroup;
    usageCount: number;
    totalDiscount: number;
    totalRevenue: number;
    transactions: { 
        transactionId: string; 
        channel: string; 
        resellerName: string | null;
        saleDate: string; 
        totalSale: number 
    }[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function VoucherAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === 'string' ? params.id : '';
    const [analytics, setAnalytics] = useState<VoucherAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const fetchAnalytics = async () => {
                setLoading(true);
                try {
                    const data = await apiFetch(`/api/finance/discounts/${id}/analytics`);
                    setAnalytics(data);
                } catch (error) {
                    console.error('Failed to fetch voucher analytics', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchAnalytics();
        }
    }, [id]);

    const AnalyticsCard = ({ title, value, icon, description }: { title: string; value: string | number; icon: React.ReactNode; description?: string }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                    </div>
                    <Skeleton className="h-96" />
                </main>
            </AppLayout>
        );
    }
    
    if (!analytics) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <p>Voucher tidak ditemukan atau terjadi kesalahan.</p>
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                     <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold">Analisis Voucher</h1>
                        <p className="text-sm text-muted-foreground">{analytics.voucher.name} - {analytics.voucher.voucherCode}</p>
                    </div>
                </div>

                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <AnalyticsCard
                        title="Total Penggunaan"
                        value={analytics.usageCount.toLocaleString('id-ID')}
                        icon={<History className="h-4 w-4 text-muted-foreground" />}
                        description="Jumlah transaksi yang menggunakan voucher ini"
                    />
                    <AnalyticsCard
                        title="Total Omzet"
                        value={formatCurrency(analytics.totalRevenue)}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                        description="Total penjualan dari transaksi dengan voucher ini"
                    />
                     <AnalyticsCard
                        title="Total Diskon Diberikan"
                        value={formatCurrency(analytics.totalDiscount)}
                        icon={<Percent className="h-4 w-4 text-muted-foreground" />}
                        description="Akumulasi nilai potongan harga dari voucher"
                    />
                     <AnalyticsCard
                        title="Sisa Kuota"
                        value={analytics.voucher.maxUses === null ? '∞' : analytics.voucher.maxUses.toLocaleString('id-ID')}
                        icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
                        description="Sisa kuota penggunaan voucher"
                    />
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat Penggunaan</CardTitle>
                        <CardDescription>Daftar semua transaksi yang menggunakan voucher ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Kanal</TableHead>
                                    <TableHead>ID Transaksi</TableHead>
                                    <TableHead className="text-right">Total Transaksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics.transactions.length > 0 ? (
                                    analytics.transactions.map((tx) => (
                                        <TableRow key={tx.transactionId}>
                                            <TableCell>{formatToWIB(parseISO(tx.saleDate), 'dd MMM yyyy, HH:mm')}</TableCell>
                                            <TableCell className="capitalize">{tx.channel === 'pos' && tx.resellerName ? `Reseller - ${tx.resellerName}` : tx.channel}</TableCell>
                                            <TableCell className="font-mono">{tx.transactionId}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(tx.totalSale)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Voucher ini belum pernah digunakan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

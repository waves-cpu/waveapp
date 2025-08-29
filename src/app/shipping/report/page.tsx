
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchShippingReceipts } from '@/lib/inventory-service';
import type { ShippingReceipt } from '@/types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';

type DailyReport = {
    date: string;
    pending: number;
    shipped: number;
    cancelled: number;
    returned: number;
    total: number;
}

function ReportSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {[...Array(5)].map((_,i) => <TableHead key={i}><Skeleton className="h-5" /></TableHead>)}
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {[...Array(10)].map((_,i) => (
                            <TableRow key={i}>
                                {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-4" /></TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function ShippingReportPage() {
    const [reportData, setReportData] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        // Show current year and last 5 years
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);

    const fetchReportData = useCallback(async () => {
        setLoading(true);
        try {
            const date = new Date(selectedYear, selectedMonth);
            const firstDay = startOfMonth(date);
            const lastDay = endOfMonth(date);

            const allReceipts: ShippingReceipt[] = [];
            let currentPage = 1;
            let hasMore = true;

            // Fetch all receipts for the selected month
            while(hasMore) {
                const { receipts } = await fetchShippingReceipts({
                    page: currentPage,
                    limit: 1000, // Large limit to fetch all in one go if possible
                    date_range: { from: firstDay, to: lastDay }
                });
                if (receipts.length > 0) {
                    allReceipts.push(...receipts);
                    currentPage++;
                } else {
                    hasMore = false;
                }
            }
            
            // Group by date and status
            const groupedByDate = allReceipts.reduce((acc, receipt) => {
                const dateKey = format(parseISO(receipt.date), 'yyyy-MM-dd');
                if (!acc[dateKey]) {
                    acc[dateKey] = {
                        date: dateKey,
                        pending: 0,
                        shipped: 0,
                        cancelled: 0,
                        returned: 0,
                        total: 0
                    };
                }

                acc[dateKey].total++;
                switch(receipt.status) {
                    case 'Perlu Diproses':
                        acc[dateKey].pending++;
                        break;
                    case 'Dikirim':
                        acc[dateKey].shipped++;
                        break;
                    case 'Dibatalkan':
                        acc[dateKey].cancelled++;
                        break;
                    case 'Return':
                        acc[dateKey].returned++;
                        break;
                }

                return acc;
            }, {} as Record<string, DailyReport>);
            
            const sortedReport = Object.values(groupedByDate).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setReportData(sortedReport);

        } catch (error) {
            console.error("Failed to fetch report data:", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data laporan.' });
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, toast]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           Laporan Resi
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {format(new Date(0, i), 'MMMM', { locale: localeId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-6">
                    {loading ? <ReportSkeleton /> : (
                        <Card>
                             <CardHeader>
                                <CardTitle>Laporan Harian Resi</CardTitle>
                                <CardDescription>Ringkasan jumlah resi per hari berdasarkan statusnya untuk bulan yang dipilih.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead className="text-center">Perlu Diproses</TableHead>
                                            <TableHead className="text-center">Dikirim</TableHead>
                                            <TableHead className="text-center">Batal</TableHead>
                                            <TableHead className="text-center">Return</TableHead>
                                            <TableHead className="text-right">Total Resi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.length > 0 ? reportData.map(item => (
                                            <TableRow key={item.date}>
                                                <TableCell className="font-medium">{format(parseISO(item.date), 'dd MMMM yyyy', {locale: localeId})}</TableCell>
                                                <TableCell className="text-center">{item.pending}</TableCell>
                                                <TableCell className="text-center">{item.shipped}</TableCell>
                                                <TableCell className="text-center">{item.cancelled}</TableCell>
                                                <TableCell className="text-center">{item.returned}</TableCell>
                                                <TableCell className="text-right font-bold">{item.total}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <FileText className="h-16 w-16" />
                                                        <p className="font-semibold">Tidak Ada Data</p>
                                                        <p className="text-sm">Tidak ada data resi pada bulan yang dipilih.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

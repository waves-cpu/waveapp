

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
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
import { FilePlus, Undo2, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchShippingReceipts } from '@/lib/inventory-service';
import type { ShippingReceipt } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'dikirim': return 'secondary';
        case 'return':
        case 'dibatalkan': return 'destructive';
        default: return 'outline';
    }
};

export default function ReturnPage() {
    const [returns, setReturns] = useState<ShippingReceipt[]>([]);
    const [totalReturns, setTotalReturns] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                status: ['Return', 'Dibatalkan']
            });
            setReturns(receipts);
            setTotalReturns(total);
        } catch (error) {
            console.error("Failed to fetch return receipts:", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data return.' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, toast]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);
    
    const totalPages = Math.ceil(totalReturns / itemsPerPage);

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           Kelola Return & Resi Batal
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <FilePlus className="mr-2 h-4 w-4" />
                            Proses Refund
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                         <CardHeader>
                            <CardTitle>Daftar Return & Resi Batal</CardTitle>
                            <CardDescription>Berikut adalah daftar resi yang telah ditandai sebagai return atau dibatalkan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No. Resi (AWB)</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="h-48 text-center">Memuat data...</TableCell></TableRow>
                                    ) : returns.length > 0 ? returns.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="outline" size="sm">
                                                    <Undo2 className="mr-2 h-3 w-3" />
                                                    Proses
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Undo2 className="h-16 w-16" />
                                                    <p className="font-semibold">Belum ada data return</p>
                                                    <p className="text-sm">Semua resi return/batal akan muncul di sini.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end p-4 border-t">
                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}


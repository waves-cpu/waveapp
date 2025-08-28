
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileDown, Trash2, Truck, ScanLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { fetchShippingReceipts, deleteShippingReceipt } from '@/lib/inventory-service';
import type { ShippingReceipt } from '@/types';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ShippingProvider = 'all' | 'Shopee' | 'Tiktok' | 'Lazada' | 'Instant';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'dikirim': return 'secondary';
        case 'return':
        case 'dibatalkan': return 'destructive';
        default: return 'outline';
    }
};

export default function ReceiptPage() {
    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ShippingProvider>('all');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language];
    const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                channel: activeTab === 'all' ? undefined : activeTab,
                date: date,
            });
            setReceipts(receipts);
            setTotalReceipts(total);
        } catch (error) {
            console.error("Failed to fetch receipts:", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data resi.' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, activeTab, date, toast]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: 'Resi dihapus', description: `Resi ${receiptToDelete.awb} telah berhasil dihapus.` });
            setReceiptToDelete(null);
            fetchReceipts(); // Refresh data
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            toast({ variant: 'destructive', title: 'Gagal menghapus resi.' });
        }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        setDatePickerOpen(false);
        setCurrentPage(1); // Reset to first page
    };

    const handleTabChange = (tab: ShippingProvider) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset to first page
    };
    
    const totalPages = Math.ceil(totalReceipts / itemsPerPage);

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           Resi Pengiriman
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={'outline'}
                                size="sm"
                                className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, 'PPP') : <span>Pilih tanggal harian</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                        {(['all', 'Shopee', 'Tiktok', 'Lazada', 'Instant'] as ShippingProvider[]).map(tab => (
                            <Button 
                                key={tab}
                                variant={activeTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleTabChange(tab)}
                                className="shrink-0"
                            >
                                {tab === 'all' ? 'Semua' : tab}
                            </Button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
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
                                    ) : receipts.length > 0 ? receipts.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy HH:mm')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setReceiptToDelete(item)}>
                                                            <Trash2 className="h-4 w-4" />
                                                         </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Hapus Resi Ini?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Anda yakin ingin menghapus resi {receiptToDelete?.awb}? Tindakan ini tidak dapat diurungkan.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={() => setReceiptToDelete(null)}>Batal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                                Ya, Hapus
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Truck className="h-16 w-16" />
                                                    <p className="font-semibold">Tidak ada resi</p>
                                                    <p className="text-sm">Data resi yang di-scan atau diinput dari mobile akan muncul di sini.</p>
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

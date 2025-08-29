
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileDown, Trash2, Truck, ScanLine, Search, Send, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { fetchShippingReceipts, deleteShippingReceipt, updateShippingReceiptsStatus, updateShippingReceiptStatus } from '@/lib/inventory-service';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useRouter } from 'next/navigation';


type ShippingProvider = 'Shopee' | 'Tiktok' | 'Lazada' | 'Instant';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'dikirim': return 'secondary';
        case 'return':
        case 'dibatalkan': return 'destructive';
        default: return 'outline';
    }
};

function parseDateFromParams(dateArray: string[] | undefined): Date {
    if (dateArray && dateArray.length > 0) {
      // Assuming the format is MM-dd-yyyy
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
}


export default function ReceiptPage() {
    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ShippingProvider>('Shopee');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language];
    const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
    const [receiptToCancel, setReceiptToCancel] = useState<ShippingReceipt | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [channelCounts, setChannelCounts] = useState<Record<ShippingProvider, number> | null>(null);
    const router = useRouter();
    const params = useParams();

    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);


    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                channel: activeTab,
                date: currentDate,
                awb: searchTerm,
            });
            setReceipts(receipts);
            setTotalReceipts(total);
        } catch (error) {
            console.error("Failed to fetch receipts:", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data resi.' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, activeTab, currentDate, searchTerm, toast]);
    
    const fetchChannelCounts = useCallback(async () => {
        const providers: ShippingProvider[] = ['Shopee', 'Tiktok', 'Lazada', 'Instant'];
        const counts: Record<ShippingProvider, number> = { 'Shopee': 0, 'Tiktok': 0, 'Lazada': 0, 'Instant': 0 };
        try {
            for (const provider of providers) {
                const { total } = await fetchShippingReceipts({
                    page: 1,
                    limit: 1, // only need the total count
                    channel: provider,
                    date: currentDate,
                });
                counts[provider] = total;
            }
            setChannelCounts(counts);
        } catch (error) {
            console.error("Failed to fetch channel counts:", error);
        }
    }, [currentDate]);


    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    useEffect(() => {
        fetchChannelCounts();
    }, [currentDate, fetchChannelCounts]);
    
    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab, currentDate, searchTerm, currentPage]);

    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: 'Resi dihapus', description: `Resi ${receiptToDelete.awb} telah berhasil dihapus.` });
            setReceiptToDelete(null);
            fetchReceipts(); // Refresh data
            fetchChannelCounts();
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            toast({ variant: 'destructive', title: 'Gagal menghapus resi.' });
        }
    };
    
    const handleCancelShipment = async () => {
        if (!receiptToCancel) return;
        try {
            await updateShippingReceiptStatus(receiptToCancel.id, 'Dibatalkan');
            toast({ title: 'Pengiriman Dibatalkan', description: `Resi ${receiptToCancel.awb} telah berhasil dibatalkan.` });
            setReceiptToCancel(null);
            fetchReceipts();
            fetchChannelCounts();
        } catch (error) {
            console.error("Failed to cancel shipment:", error);
            toast({ variant: 'destructive', title: 'Gagal Membatalkan', description: 'Terjadi kesalahan saat membatalkan pengiriman.' });
        }
    };

    const handleProcessShipment = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        try {
            await updateShippingReceiptsStatus(Array.from(selectedIds), 'Dikirim');
            toast({ title: 'Resi Diproses', description: `${selectedIds.size} resi telah berhasil diperbarui menjadi "Dikirim".` });
            setSelectedIds(new Set());
            fetchReceipts();
            fetchChannelCounts();
        } catch (error) {
            console.error("Failed to process shipments:", error);
            toast({ variant: 'destructive', title: 'Gagal Memproses', description: 'Terjadi kesalahan saat memperbarui status resi.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = format(selectedDate, 'MM-dd-yyyy');
            router.push(`/shipping/receipt/${formattedDate}`);
            setDatePickerOpen(false);
            setCurrentPage(1); // Reset to first page
        }
    };

    const handleTabChange = (tab: ShippingProvider) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset to first page
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const processableIds = receipts.filter(r => r.status === 'Perlu Diproses').map(r => r.id);
            setSelectedIds(new Set(processableIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: number, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (isChecked) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        setSelectedIds(newSelectedIds);
    };
    
    const totalPages = Math.ceil(totalReceipts / itemsPerPage);
    const isAllSelected = receipts.length > 0 && receipts.filter(r => r.status === 'Perlu Diproses').every(r => selectedIds.has(r.id));

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
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari No. Resi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-9 w-64"
                            />
                         </div>
                         <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={'outline'}
                                size="sm"
                                className={cn(
                                "w-[180px] justify-start text-left font-normal",
                                !currentDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {currentDate ? format(currentDate, 'PPP') : <span>Pilih tanggal</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                         <Button size="sm" onClick={handleProcessShipment} disabled={selectedIds.size === 0 || isProcessing}>
                            <Send className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Memproses...' : `Proses Kirim (${selectedIds.size})`}
                         </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                        {(['Shopee', 'Tiktok', 'Lazada', 'Instant'] as ShippingProvider[]).map(tab => (
                            <Button 
                                key={tab}
                                variant={activeTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleTabChange(tab)}
                                className="shrink-0"
                            >
                                {tab}
                                {channelCounts && (
                                    <Badge variant={activeTab === tab ? 'default' : 'secondary'} className="ml-2">
                                        {channelCounts[tab]}
                                    </Badge>
                                )}
                            </Button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                             <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                                disabled={receipts.filter(r => r.status === 'Perlu Diproses').length === 0}
                                            />
                                        </TableHead>
                                        <TableHead>No. Resi (AWB)</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="h-48 text-center">Memuat data...</TableCell></TableRow>
                                    ) : receipts.length > 0 ? receipts.map(item => (
                                        <TableRow key={item.id} data-state={selectedIds.has(item.id) && 'selected'}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                                                    aria-label={`Select receipt ${item.awb}`}
                                                    disabled={item.status !== 'Perlu Diproses'}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy HH:mm')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.status === 'Perlu Diproses' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); setReceiptToCancel(item); }}>
                                                                <Ban className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Batalkan Pengiriman Ini?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Anda yakin ingin membatalkan resi {receiptToCancel?.awb}? Status akan diubah menjadi "Dibatalkan".
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setReceiptToCancel(null)}>Tidak</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleCancelShipment} className="bg-destructive hover:bg-destructive/90">
                                                                    Ya, Batalkan
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); setReceiptToDelete(item); }}>
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
                                            <TableCell colSpan={6} className="h-48 text-center">
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

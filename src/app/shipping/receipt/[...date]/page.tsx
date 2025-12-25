

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileDown, Trash2, Truck, ScanLine, Search, Send, Ban, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, endOfDay, startOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt } from '@/types';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type ShippingProvider = 'SPX' | 'J&T' | 'JNE' | 'INSTANT' | 'CARGO';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'dikirim': return 'secondary';
        case 'return':
        case 'dibatalkan': return 'destructive';
        default: return 'outline';
    }
};

const STATUS_OPTIONS = ['Perlu Diproses', 'Dikirim', 'Selesai', 'Return', 'Return Selesai', 'Dibatalkan'];

function parseDateFromParams(dateArray: string[] | undefined): Date | null {
    if (dateArray && dateArray.length > 0) {
      if (dateArray[0] === 'semua') return null;
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
}


export default function ReceiptPage() {
    const { allShippingReceipts, loading, toast, language, t, router, params, deleteShippingReceipt, cancelSaleTransaction, updateShippingReceiptStatus, updateShippingReceiptsStatus, getPendingReceiptsBeforeDate } = useReceiptPageLogic();

    const [activeShippingTab, setActiveShippingTab] = useState<string | null>(null);
    const [activeSalesChannelTab, setActiveSalesChannelTab] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [activeStatusFilter, setActiveStatusFilter] = useState<string>(STATUS_OPTIONS[0]);

    const [pendingOldReceiptsCount, setPendingOldReceiptsCount] = useState(0);

    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);
    
    const checkOldPendingReceipts = useCallback(async () => {
        if (!currentDate) return;
        try {
            const count = await getPendingReceiptsBeforeDate(currentDate);
            setPendingOldReceiptsCount(count);
        } catch (error) {
        }
    }, [currentDate, getPendingReceiptsBeforeDate]);

    useEffect(() => {
        if(currentDate) checkOldPendingReceipts();
    }, [checkOldPendingReceipts, currentDate]);
    
    useEffect(() => {
        setCurrentPage(1);
        setActiveSalesChannelTab(null);
        setActiveShippingTab(null);
    }, [currentDate, searchTerm, activeStatusFilter]);
    
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeShippingTab, activeSalesChannelTab, currentDate, searchTerm, currentPage, activeStatusFilter]);

    const filteredByDate = useMemo(() => {
        if (!currentDate) return allShippingReceipts; // Show all if no date is selected
        const start = startOfDay(currentDate);
        const end = endOfDay(currentDate);
        return allShippingReceipts.filter(r => {
            const receiptDate = parseISO(r.date);
            return receiptDate >= start && receiptDate <= end;
        });
    }, [allShippingReceipts, currentDate]);


    const filteredReceipts = useMemo(() => {
        return filteredByDate.filter(receipt => {
            const salesChannelMatch = !activeSalesChannelTab || receipt.salesChannel === activeSalesChannelTab;
            const shippingChannelMatch = !activeShippingTab || receipt.channel === activeShippingTab;
            const statusMatch = activeStatusFilter === 'Semua Status' || receipt.status === activeStatusFilter;
            const searchMatch = !searchTerm || receipt.awb.toLowerCase().includes(searchTerm.toLowerCase());
            return salesChannelMatch && shippingChannelMatch && statusMatch && searchMatch;
        });
    }, [filteredByDate, activeSalesChannelTab, activeShippingTab, activeStatusFilter, searchTerm]);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage, itemsPerPage]);

     const { salesChannelCounts, shippingChannelCounts, statusCounts } = useMemo(() => {
        const sc: Record<string, number> = {};
        const shc: Record<string, number> = {};
        const st: Record<string, number> = {};
        STATUS_OPTIONS.forEach(s => st[s] = 0);

        filteredByDate.forEach(r => {
            const salesChannelMatch = !activeSalesChannelTab || r.salesChannel === activeSalesChannelTab;
            const shippingChannelMatch = !activeShippingTab || r.channel === activeShippingTab;
            const statusMatch = activeStatusFilter === 'Semua Status' || r.status === activeStatusFilter;

            if (shippingChannelMatch && statusMatch && r.salesChannel) {
                sc[r.salesChannel] = (sc[r.salesChannel] || 0) + 1;
            }
            if (salesChannelMatch && statusMatch) {
                shc[r.channel] = (shc[r.channel] || 0) + 1;
            }
            if (salesChannelMatch && shippingChannelMatch) {
                st[r.status] = (st[r.status] || 0) + 1;
            }
        });
        return { salesChannelCounts: sc, shippingChannelCounts: shc, statusCounts: st };
    }, [filteredByDate, activeSalesChannelTab, activeShippingTab, activeStatusFilter]);


    const handleDelete = async (receiptToDelete: ShippingReceipt) => {
        if (!receiptToDelete) return;
        const { toast: toastRef } = toast({ title: t.deleteInProgress, description: `Menghapus resi ${receiptToDelete.awb}...` });
        try {
            if (receiptToDelete.transactionId) {
                await cancelSaleTransaction(receiptToDelete.transactionId);
            }
            await deleteShippingReceipt(receiptToDelete.id);
            toastRef.update({ id: toastRef.id, title: t.deleteSuccess, description: 'Resi dihapus dan stok telah dikembalikan.' });
        } catch (error) {
            toastRef.update({ id: toastRef.id, title: t.deleteError, description: 'Gagal menghapus resi dan mengembalikan stok.', variant: 'destructive' });
        }
    };
    
    const handleChangeStatus = async (receipt: ShippingReceipt, newStatus: string) => {
        const { toast: toastRef } = toast({ title: t.statusUpdateInProgress, description: `Mengubah status resi...` });
        try {
            await updateShippingReceiptStatus(receipt.id, newStatus);
            toastRef.update({ id: toastRef.id, title: t.statusUpdateSuccess, description: t.statusUpdateSuccessDesc.replace('{status}', newStatus) });
        } catch (error) {
            toastRef.update({ id: toastRef.id, title: t.statusUpdateError, description: t.statusUpdateErrorDesc, variant: 'destructive' });
        }
    };

    const handleProcessShipment = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        const { toast: toastRef } = toast({ title: t.bulkProcessInProgress, description: `Memproses ${selectedIds.size} resi...` });
        try {
            await updateShippingReceiptsStatus(Array.from(selectedIds), 'Dikirim');
            toastRef.update({ id: toastRef.id, title: t.bulkProcessSuccess, description: t.bulkProcessSuccessDesc.replace('{count}', selectedIds.size.toString()) });
            setSelectedIds(new Set());
        } catch (error) {
            toastRef.update({ id: toastRef.id, title: t.bulkProcessError, description: t.bulkProcessErrorDesc, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = format(selectedDate, 'MM-dd-yyyy');
            router.push(`/shipping/receipt/${formattedDate}`);
            setDatePickerOpen(false);
        } else {
            router.push('/shipping/receipt/semua');
        }
    };
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const processableIds = paginatedReceipts.filter(r => r.status === 'Perlu Diproses').map(r => r.id);
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
    
    const handleShowAllPending = () => {
        router.push('/shipping/receipt/semua');
        setActiveStatusFilter('Perlu Diproses');
    };

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    const isAllSelected = paginatedReceipts.length > 0 && paginatedReceipts.filter(r => r.status === 'Perlu Diproses').length > 0 && paginatedReceipts.filter(r => r.status === 'Perlu Diproses').every(r => selectedIds.has(r.id));
    const finalStatuses = ['Selesai', 'Return', 'Dibatalkan', 'Return Selesai'];

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           {t.title}
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchPlaceholder}
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
                                {currentDate ? format(currentDate, 'PPP') : <span>{t.selectDate}</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={currentDate || undefined}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                         {selectedIds.size > 0 && (
                            <Button size="sm" onClick={handleProcessShipment} disabled={isProcessing}>
                                <Send className="mr-2 h-4 w-4" />
                                {isProcessing ? t.processing : `${t.processSelected} (${selectedIds.size})`}
                            </Button>
                         )}
                    </div>
                </div>
                 {pendingOldReceiptsCount > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Pekerjaan Tertunda</AlertTitle>
                        <AlertDescription className="flex justify-between items-center">
                            Anda memiliki {pendingOldReceiptsCount} resi dari hari sebelumnya yang belum diproses.
                             <Button variant="secondary" size="sm" onClick={handleShowAllPending}>Lihat & Proses Sekarang</Button>
                        </AlertDescription>
                    </Alert>
                )}


                <div className="flex flex-col gap-4">
                     <div className="border-b">
                         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            {(['Shopee', 'Tiktok', 'Lazada'] as const).map(tab => (
                                <Button 
                                    key={tab}
                                    variant={activeSalesChannelTab === tab ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveSalesChannelTab(prev => prev === tab ? null : tab)}
                                    className={cn("shrink-0", activeSalesChannelTab === tab && "text-primary")}
                                >
                                    {tab}
                                    <Badge variant={activeSalesChannelTab === tab ? 'default' : 'secondary'} className="ml-2">
                                        {salesChannelCounts[tab] || 0}
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                        {(['SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'] as ShippingProvider[]).map(tab => (
                             <Button 
                                key={tab}
                                variant={activeShippingTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveShippingTab(prev => prev === tab ? null : tab)}
                                className={cn("shrink-0", activeShippingTab === tab && "text-primary")}
                            >
                                {tab}
                                <Badge variant={activeShippingTab === tab ? 'default' : 'secondary'} className="ml-2">
                                    {shippingChannelCounts[tab] || 0}
                                </Badge>
                            </Button>
                        ))}
                    </div>
                     <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {STATUS_OPTIONS.map(status => (
                            <Button
                                key={status}
                                variant={activeStatusFilter === status ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveStatusFilter(status)}
                                className={cn("shrink-0", activeStatusFilter === status && "text-primary")}
                            >
                                {status}
                                <Badge variant={activeStatusFilter === status ? 'default' : 'secondary'} className="ml-2">
                                    {statusCounts[status] || 0}
                                </Badge>
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
                                                aria-label={t.selectAll}
                                                disabled={paginatedReceipts.filter(r => r.status === 'Perlu Diproses').length === 0}
                                            />
                                        </TableHead>
                                        <TableHead>{t.table.awb}</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Kanal Penjualan</TableHead>
                                        <TableHead>Jasa Kirim</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">{t.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={7} className="h-48 text-center">{t.loading}</TableCell></TableRow>
                                    ) : paginatedReceipts.length > 0 ? paginatedReceipts.map(item => (
                                        <TableRow key={item.id} data-state={selectedIds.has(item.id) && 'selected'}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                                                    aria-label={`${t.select} ${item.awb}`}
                                                    disabled={item.status !== 'Perlu Diproses'}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{item.salesChannel}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                         {item.status === 'Perlu Diproses' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Dikirim')}>{t.actions.processShipment}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Dibatalkan')} className="text-destructive">{t.actions.cancel}</DropdownMenuItem>
                                                            </>
                                                         )}
                                                         {item.status === 'Dikirim' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Selesai')}>{t.actions.markAsDone}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Return')} className="text-destructive">{t.actions.markAsReturn}</DropdownMenuItem>
                                                            </>
                                                         )}
                                                         {['Dibatalkan', 'Return'].includes(item.status) && (
                                                              <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            {t.deleteConfirmDesc.replace('{awb}', item.awb)}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive hover:bg-destructive/90">
                                                                            {t.deleteConfirmAction}
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                         )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Truck className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noReceiptsTitle}</p>
                                                    <p className="text-sm">{t.noReceiptsDesc}</p>
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

function useReceiptPageLogic() {
    const { 
        allShippingReceipts, 
        loading: inventoryLoading, 
        deleteShippingReceipt, 
        cancelSaleTransaction, 
        updateShippingReceiptStatus,
        updateShippingReceiptsStatus,
        getPendingReceiptsBeforeDate
    } = useInventory();
    const { toast: showToast } = useToast();
    const { language } = useLanguage();
    const t = translations[language].shipping.receiptPage;
    const router = useRouter();
    const params = useParams();

    return {
        allShippingReceipts,
        loading: inventoryLoading,
        toast: showToast,
        language,
        t,
        router,
        params,
        deleteShippingReceipt,
        cancelSaleTransaction,
        updateShippingReceiptStatus,
        updateShippingReceiptsStatus,
        getPendingReceiptsBeforeDate,
    };
}

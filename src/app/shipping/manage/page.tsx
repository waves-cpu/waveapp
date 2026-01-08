

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Undo2, Truck, CheckCircle, Package, Search, Send, Ban, History, MoreVertical, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ReturnedItem } from '@/types';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subDays, startOfYear, subMonths, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessReturnDialog } from '@/app/components/process-return-dialog';
import { formatToWIB, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { CancelShipmentDialog } from '@/app/components/cancel-shipment-dialog';

const SHIPPING_CHANNEL_OPTIONS = ['Semua Jasa Kirim', 'SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'];

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'siap kirim': return 'secondary';
        case 'terproses': return 'secondary';
        case 'diantar': return 'secondary';
        case 'return':
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

type StatusTab = 'Terproses' | 'Siap Kirim' | 'Selesai' | 'Return' | 'Return Selesai' | 'Dibatalkan';

const ReceiptTable = ({ 
    receipts,
    status,
    onAction,
    onBulkAction,
    isProcessing,
}: { 
    receipts: ShippingReceipt[],
    status: StatusTab,
    onAction: (receipt: ShippingReceipt, newStatus: string) => void,
    onBulkAction: (ids: number[], newStatus: string) => void,
    isProcessing: boolean,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            const searchMatch = !searchTerm || r.awb.toLowerCase().includes(searchTerm.toLowerCase());
            const channelMatch = !channelFilter || r.channel === channelFilter;
            return searchMatch && channelMatch;
        });
    }, [receipts, searchTerm, channelFilter]);

    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [searchTerm, channelFilter, receipts]);

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage, itemsPerPage]);
    
    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(new Set(checked ? paginatedReceipts.map(r => r.id) : []));
    };

    const handleSelectOne = (id: number, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        isChecked ? newSelectedIds.add(id) : newSelectedIds.delete(id);
        setSelectedIds(newSelectedIds);
    };

    const isAllOnPageSelected = paginatedReceipts.length > 0 && paginatedReceipts.every(r => selectedIds.has(r.id));
    
    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Cari No. Resi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <Select value={channelFilter || 'all'} onValueChange={v => setChannelFilter(v === 'all' ? null : v)}>
                        <SelectTrigger className="w-[200px] h-9">
                            <SelectValue placeholder="Filter Jasa Kirim" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jasa Kirim</SelectItem>
                            {SHIPPING_CHANNEL_OPTIONS.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                     {selectedIds.size > 0 && status === 'Terproses' && (
                        <Button size="sm" onClick={() => onBulkAction(Array.from(selectedIds), 'Siap Kirim')} disabled={isProcessing}>
                            <Send className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Memproses...' : `Proses Kirim (${selectedIds.size})`}
                        </Button>
                     )}
                     {selectedIds.size > 0 && status === 'Siap Kirim' && (
                        <>
                            <Button size="sm" onClick={() => onBulkAction(Array.from(selectedIds), 'Selesai')} disabled={isProcessing}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Memproses...' : `Tandai Selesai (${selectedIds.size})`}
                            </Button>
                             <Button size="sm" variant="destructive" onClick={() => onBulkAction(Array.from(selectedIds), 'Dibatalkan')} disabled={isProcessing}>
                                <Ban className="mr-2 h-4 w-4" />
                                {isProcessing ? 'Memproses...' : `Batalkan (${selectedIds.size})`}
                            </Button>
                        </>
                     )}
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                         <TableHead className="w-12"><Checkbox checked={isAllOnPageSelected} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead>No. Resi</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kanal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedReceipts.length > 0 ? paginatedReceipts.map(receipt => (
                        <TableRow key={receipt.id} data-state={selectedIds.has(receipt.id) && 'selected'}>
                             <TableCell><Checkbox checked={selectedIds.has(receipt.id)} onCheckedChange={(c) => handleSelectOne(receipt.id, !!c)} /></TableCell>
                            <TableCell className="font-medium">{receipt.awb}</TableCell>
                            <TableCell>{formatToWIB(parseISO(receipt.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{receipt.channel}</TableCell>
                            <TableCell><Badge variant={getStatusVariant(receipt.status)}>{receipt.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {receipt.status === 'Terproses' && <DropdownMenuItem onClick={() => onAction(receipt, 'Siap Kirim')}><Send className="mr-2 h-4 w-4" /> Tandai Siap Kirim</DropdownMenuItem>}
                                        {receipt.status === 'Siap Kirim' && (
                                            <>
                                                <DropdownMenuItem onClick={() => onAction(receipt, 'Selesai')}><CheckCircle className="mr-2 h-4 w-4" /> Tandai Selesai</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onAction(receipt, 'Dibatalkan')} className="text-destructive"><Ban className="mr-2 h-4 w-4" /> Batalkan</DropdownMenuItem>
                                            </>
                                        )}
                                        {receipt.status === 'Return' && <DropdownMenuItem onClick={() => onAction(receipt, 'Return Selesai')}><Package className="mr-2 h-4 w-4" /> Proses Barang Return</DropdownMenuItem>}
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Resi Ini?</AlertDialogTitle>
                                                    <AlertDialogDescription>Aksi ini akan menghapus resi secara permanen. Pertimbangkan untuk membatalkan jika ingin stok kembali.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onAction(receipt, 'Delete')} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Tidak ada resi dengan status ini.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="pt-4 border-t">
                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default function ManageReceiptsPage() {
    const { allShippingReceipts, updateShippingReceiptStatus, updateShippingReceiptsStatus, deleteShippingReceipt, returnSaleTransaction, cancelSaleTransaction, loading } = useInventory();
    const { toast } = useToast();
    const [receiptToProcess, setReceiptToProcess] = useState<ShippingReceipt | null>(null);
    const [receiptToCancel, setReceiptToCancel] = useState<ShippingReceipt | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const filteredReceipts = useMemo(() => {
        return allShippingReceipts.filter(receipt => {
            if (!date || !date.from) return true;
            const receiptDate = parseISO(receipt.date);
            const toDate = date.to || date.from;
            return isWithinInterval(receiptDate, { start: startOfDay(date.from), end: endOfDay(toDate) });
        });
    }, [allShippingReceipts, date]);


    const handleAction = useCallback(async (receipt: ShippingReceipt, newStatus: string) => {
        if (newStatus === 'Return Selesai') {
            setReceiptToProcess(receipt);
        } else if (newStatus === 'Dibatalkan' && receipt.status === 'Siap Kirim') {
            setReceiptToCancel(receipt);
        } else if (newStatus === 'Delete') {
             try {
                await deleteShippingReceipt(receipt.id);
                toast({ title: 'Resi Dihapus', description: `Resi ${receipt.awb} telah dihapus.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Menghapus' });
            }
        } else {
            try {
                await updateShippingReceiptStatus(receipt.id, newStatus);
                toast({ title: 'Status Diperbarui', description: `Status untuk resi ${receipt.awb} telah diubah.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Memperbarui Status' });
            }
        }
    }, [updateShippingReceiptStatus, deleteShippingReceipt, toast]);
    
    const handleBulkAction = useCallback(async (ids: number[], newStatus: string) => {
        setIsProcessing(true);
        const toastRef = toast({ title: 'Memproses...', description: `Memproses ${ids.length} resi...` });
        try {
          await updateShippingReceiptsStatus(ids, newStatus);
          toastRef.update({ id: toastRef.id, title: 'Berhasil', description: `Status untuk ${ids.length} resi berhasil diubah.` });
        } catch (error) {
          toastRef.update({ id: toastRef.id, title: 'Gagal', description: 'Terjadi kesalahan saat memperbarui status.', variant: 'destructive' });
        } finally {
          setIsProcessing(false);
        }
    }, [updateShippingReceiptsStatus, toast]);

    const handleProcessReturn = async (transactionId: string, items: ReturnedItem[]) => {
        if (!receiptToProcess) return;
        try {
            await returnSaleTransaction(transactionId, items);
            
            const finalStatus = receiptToProcess.status === 'Dibatalkan' ? 'Selesai' : 'Return Selesai';
            await handleChangeStatus(receiptToProcess.id, finalStatus);

            toast({ title: 'Return Diproses', description: `Stok untuk transaksi ${transactionId} telah dikembalikan.` });
            setReceiptToProcess(null); // Close dialog
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Memproses Return', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
            throw error; // Prevent dialog from closing on error
        }
    };
    
    const handleProcessCancellation = async (transactionId: string) => {
        if (!receiptToCancel) return;
        try {
            await cancelSaleTransaction(transactionId);
            toast({ title: 'Transaksi Dibatalkan', description: `Stok untuk transaksi ${transactionId} telah dikembalikan.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Membatalkan', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
            throw error;
        } finally {
             setReceiptToCancel(null);
        }
    };

    const groupedReceipts = useMemo(() => {
        const groups: Record<StatusTab, ShippingReceipt[]> = {
            'Terproses': [],
            'Siap Kirim': [],
            'Selesai': [],
            'Return': [],
            'Return Selesai': [],
            'Dibatalkan': []
        };
        filteredReceipts.forEach(r => {
            if (r.status in groups) {
                groups[r.status as StatusTab].push(r);
            }
        });
        return groups;
    }, [filteredReceipts]);
    
    const tabs: { status: StatusTab, icon: React.ElementType }[] = [
        { status: 'Terproses', icon: Truck },
        { status: 'Siap Kirim', icon: Truck },
        { status: 'Selesai', icon: CheckCircle },
        { status: 'Return', icon: Undo2 },
        { status: 'Return Selesai', icon: History },
        { status: 'Dibatalkan', icon: Ban },
    ];
    
    const datePresets = [
        { label: "Hari Ini", range: { from: new Date(), to: new Date() } },
        { label: "Kemarin", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
        { label: "Bulan Ini", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: "Bulan Lalu", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
        { label: "Tahun Ini", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
    ];

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 md:hidden" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <Skeleton className="h-96 w-full" />
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Kelola Status Resi</h1>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-auto justify-start text-left font-normal h-9",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {formatToWIB(date.from, "LLL dd, y")} -{" "}
                                            {formatToWIB(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        formatToWIB(date.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pilih rentang tanggal</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="flex w-auto p-0" align="end">
                           <div className="flex flex-col gap-1 pr-4 border-r py-2">
                                {datePresets.map(preset => (
                                    <Button key={preset.label} variant="ghost" className="justify-start" onClick={() => setDate(preset.range)}>{preset.label}</Button>
                                ))}
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={1}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <Tabs defaultValue="Terproses" className="w-full">
                    <div className="border-b">
                         <TabsList className="h-auto p-0 bg-transparent flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            {tabs.map(tab => (
                                <TabsTrigger 
                                    key={tab.status} 
                                    value={tab.status} 
                                    className="whitespace-nowrap px-4 py-2 text-sm text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                                >
                                    <tab.icon className="mr-2 h-4 w-4" />
                                    {tab.status}
                                    <Badge variant="secondary" className="ml-2">{groupedReceipts[tab.status].length}</Badge>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    {tabs.map(tab => (
                        <TabsContent key={tab.status} value={tab.status} className="mt-6">
                            <ReceiptTable 
                                receipts={groupedReceipts[tab.status]}
                                status={tab.status}
                                onAction={handleAction}
                                onBulkAction={handleBulkAction}
                                isProcessing={isProcessing}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </main>
            <ProcessReturnDialog
                open={!!receiptToProcess}
                onOpenChange={(isOpen) => !isOpen && setReceiptToProcess(null)}
                onProcessReturn={handleProcessReturn}
                receipt={receiptToProcess}
            />
            <CancelShipmentDialog
                open={!!receiptToCancel}
                onOpenChange={(isOpen) => !isOpen && setReceiptToCancel(null)}
                onProcessCancellation={handleProcessCancellation}
                receipt={receiptToCancel}
            />
        </AppLayout>
    );
}

    

    


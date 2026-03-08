

'use client';

import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Undo2, Truck, CheckCircle, Package, Search, Send, Ban, History, MoreVertical, Trash2, Calendar as CalendarIcon, Eye, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ReturnedItem, Sale } from '@/types';
import { parseISO, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subDays, startOfYear, subMonths, endOfYear, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessReturnDialog } from '@/app/components/process-return-dialog';
import { formatToWIB, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { CancelShipmentDialog } from '@/app/components/cancel-shipment-dialog';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { useAuth } from '@/hooks/use-auth';
import * as XLSX from 'xlsx';

const SHIPPING_CHANNEL_OPTIONS = ['Semua Jasa Kirim', 'SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'];

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'success';
        case 'return selesai': return 'purple';
        case 'siap kirim': return 'info';
        case 'terproses': return 'warning';
        case 'diantar': return 'info';
        case 'return': return 'orange';
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

const STATUS_FLOW = {
    TERPROSES: 'Terproses',
    SIAP_KIRIM: 'Siap Kirim',
    SELESAI: 'Selesai',
    RETURN: 'Return',
    RETURN_SELESAI: 'Return Selesai',
    DIBATALKAN: 'Dibatalkan',
    DELETE: 'Delete',
    VIEW_DETAILS: 'View Details'
} as const;

type StatusTab = 'Terproses' | 'Siap Kirim' | 'Selesai' | 'Return' | 'Return Selesai' | 'Dibatalkan';

const DropdownAction = ({ receipt, onAction }: { receipt: ShippingReceipt, onAction: any }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.VIEW_DETAILS)}>
                <Eye className="mr-2 h-4 w-4" /> Lihat Detail
            </DropdownMenuItem>
            <Separator className="my-1" />
            {receipt.status === STATUS_FLOW.TERPROSES && <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.SIAP_KIRIM)}><Send className="mr-2 h-4 w-4" /> Tandai Siap Kirim</DropdownMenuItem>}
            {receipt.status === STATUS_FLOW.SIAP_KIRIM && (
                <>
                    <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.SELESAI)}><CheckCircle className="mr-2 h-4 w-4" /> Tandai Selesai</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.DIBATALKAN)} className="text-destructive"><Ban className="mr-2 h-4 w-4" /> Batalkan</DropdownMenuItem>
                </>
            )}
            {receipt.status === STATUS_FLOW.SELESAI && <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.RETURN)}><Undo2 className="mr-2 h-4 w-4 text-orange-500" /> Tandai Return</DropdownMenuItem>}
            {receipt.status === STATUS_FLOW.RETURN && <DropdownMenuItem onClick={() => onAction(receipt, STATUS_FLOW.RETURN_SELESAI)}><Package className="mr-2 h-4 w-4" /> Proses Barang Sampai</DropdownMenuItem>}
            
            <Separator className="my-1" />
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus Resi</DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                        <AlertDialogDescription>Aksi ini akan menghapus resi. Jika resi belum selesai diproses (status 'Terproses' atau 'Siap Kirim'), stok akan dikembalikan secara otomatis. Lanjutkan?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onAction(receipt, 'Delete')} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DropdownMenuContent>
    </DropdownMenu>
);

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
    const [itemsPerPage] = useState(25);
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearch = useDeferredValue(searchTerm); 
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            const searchMatch = !deferredSearch || r.awb.toLowerCase().includes(deferredSearch.toLowerCase());
            return searchMatch;
        });
    }, [receipts, deferredSearch]);

    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [status, deferredSearch]);

    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage, itemsPerPage]);
    
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            const allIdsOnPage = paginatedReceipts.map(r => r.id);
            setSelectedIds(prev => new Set([...Array.from(prev), ...allIdsOnPage]));
        } else {
            const idsOnPage = new Set(paginatedReceipts.map(r => r.id));
            setSelectedIds(prev => new Set(Array.from(prev).filter(id => !idsOnPage.has(id))));
        }
    }, [paginatedReceipts]);

    const handleSelectOne = useCallback((id: number, isChecked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isChecked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const isAllSelected = paginatedReceipts.length > 0 && paginatedReceipts.every(r => selectedIds.has(r.id));
    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Cari No. Resi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 bg-primary/5 p-1 px-2 rounded-md border border-primary/20">
                        <span className="text-xs font-medium mr-2">{selectedIds.size} dipilih</span>
                        {status === STATUS_FLOW.TERPROSES && (
                            <Button size="sm" onClick={() => onBulkAction(Array.from(selectedIds), STATUS_FLOW.SIAP_KIRIM)} disabled={isProcessing}>
                                <Send className="mr-2 h-4 w-4" /> {isProcessing ? 'Memproses...' : 'Proses Kirim'}
                            </Button>
                        )}
                        {status === STATUS_FLOW.SIAP_KIRIM && (
                            <Button size="sm" onClick={() => onBulkAction(Array.from(selectedIds), STATUS_FLOW.SELESAI)} disabled={isProcessing}>
                                <CheckCircle className="mr-2 h-4 w-4" /> {isProcessing ? 'Memproses...' : 'Selesai'}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                             <TableHead className="w-12"><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                            <TableHead>No. Resi</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Kurir</TableHead>
                            <TableHead>Diproses Oleh</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedReceipts.length > 0 ? paginatedReceipts.map(receipt => (
                            <TableRow key={receipt.id} data-state={selectedIds.has(receipt.id) ? 'selected' : 'unselected'}>
                                 <TableCell><Checkbox checked={selectedIds.has(receipt.id)} onCheckedChange={(c) => handleSelectOne(receipt.id, !!c)} /></TableCell>
                                <TableCell className="font-mono font-medium">{receipt.awb}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatToWIB(parseISO(receipt.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell><Badge variant="outline">{receipt.channel}</Badge></TableCell>
                                <TableCell>{receipt.username || '-'}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(receipt.status)}>{receipt.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <DropdownAction receipt={receipt} onAction={onAction} />
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    Data tidak ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
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
    const { allShippingReceipts, updateShippingReceiptStatus, updateShippingReceiptsStatus, deleteShippingReceipt, returnSaleTransaction, cancelSaleTransaction, loading, allSales } = useInventory();
    const { toast } = useToast();
    const { user } = useAuth();
    const [receiptToProcess, setReceiptToProcess] = useState<ShippingReceipt | null>(null);
    const [receiptToCancel, setReceiptToCancel] = useState<ShippingReceipt | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [detailItems, setDetailItems] = useState<Sale[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    
    const [shippingChannel, setShippingChannel] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const filteredReceipts = useMemo(() => {
        return allShippingReceipts.filter(receipt => {
            const dateMatch = !date || !date.from || isWithinInterval(parseISO(receipt.date), { start: startOfDay(date.from), end: endOfDay(date.to || date.from) });
            const channelMatch = !shippingChannel || receipt.channel === shippingChannel;
            return dateMatch && channelMatch;
        });
    }, [allShippingReceipts, date, shippingChannel]);


    const handleAction = useCallback(async (receipt: ShippingReceipt, newStatus: string) => {
        if (newStatus === STATUS_FLOW.RETURN_SELESAI) {
            setReceiptToProcess(receipt);
        } else if (newStatus === STATUS_FLOW.DIBATALKAN && receipt.status === STATUS_FLOW.SIAP_KIRIM) {
            setReceiptToCancel(receipt);
        } else if (newStatus === STATUS_FLOW.DELETE) {
             try {
                await deleteShippingReceipt(receipt.id);
                toast({ title: 'Resi Dihapus', description: `Resi ${receipt.awb} telah dihapus.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Menghapus' });
            }
        } else if (newStatus === STATUS_FLOW.VIEW_DETAILS) {
            const items = allSales.filter(s => s.transactionId === receipt.transactionId);
            if (items.length > 0) {
                setDetailItems(items);
                setIsDetailOpen(true);
            } else {
                toast({
                    title: "Tidak ada detail",
                    description: "Tidak ada produk yang tercatat untuk resi ini.",
                    variant: "destructive"
                });
            }
        } else {
            try {
                await updateShippingReceiptStatus(receipt.id, newStatus, user?.id, user?.username);
                toast({ title: 'Status Diperbarui', description: `Status untuk resi ${receipt.awb} telah diubah.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Memperbarui Status' });
            }
        }
    }, [updateShippingReceiptStatus, deleteShippingReceipt, toast, allSales, user]);
    
    const handleBulkAction = useCallback(async (ids: number[], newStatus: string) => {
        setIsProcessing(true);
        const toastRef = toast({ title: 'Memproses...', description: `Memproses ${ids.length} resi...` });
        try {
          await updateShippingReceiptsStatus(ids, newStatus, user?.id, user?.username);
          toastRef.update({ id: toastRef.id, title: 'Berhasil', description: `Status untuk ${ids.length} resi berhasil diubah.` });
        } catch (error) {
          toastRef.update({ id: toastRef.id, title: 'Gagal', description: 'Terjadi kesalahan saat memperbarui status.', variant: 'destructive' });
        } finally {
          setIsProcessing(false);
        }
    }, [updateShippingReceiptsStatus, toast, user]);

    const handleProcessReturn = async (transactionId: string, items: ReturnedItem[]) => {
        if (!receiptToProcess) return;
        try {
            await returnSaleTransaction(transactionId, items);
            
            const finalStatus = receiptToProcess.status === 'Dibatalkan' ? 'Selesai' : 'Return Selesai';
            await updateShippingReceiptStatus(receiptToProcess.id, finalStatus, user?.id, user?.username);

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
            await updateShippingReceiptStatus(receiptToCancel.id, 'Dibatalkan', user?.id, user?.username);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Membatalkan', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
            throw error;
        } finally {
             setReceiptToCancel(null);
        }
    };
    
    const downloadExcel = useCallback(() => {
        setIsDownloading(true);
        const { id, update } = toast({ title: 'Memulai unduhan', description: 'Laporan Excel sedang disiapkan...' });

        setTimeout(() => {
            const dataToExport = filteredReceipts.map(item => ({
                'No. Resi': item.awb,
                'Tanggal': formatToWIB(parseISO(item.date), 'dd MMM yyyy HH:mm'),
                'Kanal Penjualan': item.salesChannel,
                'Jasa Kirim': item.channel,
                'Status': item.status,
                'Diproses Oleh': item.username || '-'
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Resi');

            const datePart = date?.from
                ? date.to && !isSameDay(date.from, date.to)
                    ? `${formatToWIB(date.from, 'ddMMyy')}-${formatToWIB(date.to, 'ddMMyy')}`
                    : formatToWIB(date.from, 'ddMMyy')
                : 'semua_waktu';
            const channelPart = shippingChannel || 'semua_kurir';
            const fileName = `Laporan_Resi_${channelPart}_${datePart}.xlsx`;
            
            XLSX.writeFile(workbook, fileName);

            update({
                id,
                title: "Unduhan Siap",
                description: `File '${fileName}' telah diunduh.`
            });
            setIsDownloading(false);
        }, 500);
    }, [filteredReceipts, date, shippingChannel, toast]);

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
                    <div className="flex items-center gap-2">
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
                         <Select value={shippingChannel || 'all'} onValueChange={v => setShippingChannel(v === 'all' ? null : v)}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Jasa Kirim" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Jasa Kirim</SelectItem>
                                {SHIPPING_CHANNEL_OPTIONS.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Button onClick={downloadExcel} variant="outline" size="sm" disabled={isDownloading} className="h-9">
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isDownloading ? "Mengekspor..." : "Download"}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="Terproses" className="w-full">
                    <TabsList className="h-auto p-1 bg-muted rounded-lg">
                        {tabs.map(tab => (
                            <TabsTrigger 
                                key={tab.status} 
                                value={tab.status} 
                                className="flex-1 px-3 py-1.5 text-sm"
                            >
                                <tab.icon className="mr-2 h-4 w-4" />
                                {tab.status}
                                <Badge variant={tab.status === 'Terproses' ? "default" : "secondary"} className="ml-2">{groupedReceipts[tab.status].length}</Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
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
            <DailySalesDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                sales={detailItems}
                title="Detail Pesanan"
            />
        </AppLayout>
    );
}

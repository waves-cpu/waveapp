

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Undo2, Truck, CheckCircle, Package, Trash2, Search, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ReturnedItem } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations } from '@/types/language';


const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'siap kirim': return 'secondary';
        case 'diantar': return 'secondary';
        case 'return':
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};


const ReturnProductDialog = ({
    open,
    onOpenChange,
    onProcessReturn,
    receipt,
    dialogTitle,
    dialogDescription,
    submitText,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProcessReturn: (transactionId: string, items: ReturnedItem[]) => Promise<void>;
    receipt: ShippingReceipt | null;
    dialogTitle: string;
    dialogDescription: string;
    submitText: string;
}) => {
    const { allSales } = useInventory();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([]);
    
    useEffect(() => {
        if (!open) {
            setReturnedItems([]);
            setIsSubmitting(false);
        } else if (receipt?.transactionId) {
            const originalSaleItems = allSales.filter(s => s.transactionId === receipt.transactionId);
            const itemsToReturn: ReturnedItem[] = [];
            
            originalSaleItems.forEach(saleItem => {
                const sku = saleItem.sku;
                if(sku) {
                    const name = saleItem.variantName ? `${saleItem.productName} - ${saleItem.variantName}` : saleItem.productName;
                    const existing = itemsToReturn.find(i => i.sku === sku);
                    if(existing) {
                        existing.quantity += saleItem.quantity;
                    } else {
                        itemsToReturn.push({ sku, name, quantity: saleItem.quantity, price: saleItem.priceAtSale });
                    }
                }
            });
            setReturnedItems(itemsToReturn);
        }
    }, [open, receipt, allSales]);

    const { totalItems, totalValue } = useMemo(() => {
        return returnedItems.reduce((acc, item) => {
            acc.totalItems += item.quantity;
            acc.totalValue += item.quantity * item.price;
            return acc;
        }, { totalItems: 0, totalValue: 0 });
    }, [returnedItems]);


    const handleFinalizeReturn = async () => {
        if (returnedItems.length === 0 || !receipt || !receipt.transactionId) return;
        setIsSubmitting(true);
        try {
            await onProcessReturn(receipt.transactionId, returnedItems);
            onOpenChange(false);
        } catch(e) {
        }
        finally {
            setIsSubmitting(false);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                           {dialogDescription}: <span className="font-semibold">{receipt?.awb}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                         <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-72 border rounded-md">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                            <TableRow>
                                                <TableHead>Produk</TableHead>
                                                <TableHead className="w-[120px] text-center">Jumlah</TableHead>
                                                <TableHead className="w-[150px] text-right">Harga Satuan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {returnedItems.length > 0 ? returnedItems.map(item => (
                                                <TableRow key={item.sku}>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                                        Tidak ada produk yang tercatat pada transaksi ini.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                         <TableFooter>
                                            <TableRow>
                                                <TableHead>Total</TableHead>
                                                <TableHead className="text-center font-bold">{totalItems}</TableHead>
                                                <TableHead className="text-right font-bold">{formatCurrency(totalValue)}</TableHead>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                         </Card>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button onClick={handleFinalizeReturn} disabled={returnedItems.length === 0 || isSubmitting}>
                            {isSubmitting ? 'Memproses...' : submitText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


export default function ReturnPage() {
    const { loading: inventoryLoading, allShippingReceipts, updateShippingReceiptStatus, deleteShippingReceipt, returnSaleTransaction } = useInventory();
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language].shipping.returnPage;
    const tCommon = translations[language].common;
    
    const [selectedReceipt, setSelectedReceipt] = useState<ShippingReceipt | null>(null);
    const [isProductSelectionDialogOpen, setIsProductSelectionDialogOpen] = useState(false);
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isDownloading, setIsDownloading] = useState(false);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);

    const allReturnsForMonth = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth);
        const firstDay = startOfMonth(date);
        const lastDay = endOfMonth(date);

        return allShippingReceipts.filter(receipt => {
            const receiptDate = parseISO(receipt.date);
            return receiptDate >= firstDay && receiptDate <= lastDay && 
                   ['Return', 'Return Selesai', 'Dibatalkan', 'Diantar', 'Tidak Sampai'].includes(receipt.status);
        });
    }, [allShippingReceipts, selectedMonth, selectedYear]);

    useEffect(() => {
        if (!inventoryLoading) {
            setLoading(false);
        }
    }, [inventoryLoading]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [activeChannel, searchTerm, selectedMonth, selectedYear]);

    const channelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allReturnsForMonth.forEach(r => {
            counts[r.channel] = (counts[r.channel] || 0) + 1;
        });
        return counts;
    }, [allReturnsForMonth]);

    const filteredReturns = useMemo(() => {
        return allReturnsForMonth.filter(receipt => {
            const channelMatch = !activeChannel || receipt.channel === activeChannel;
            const searchMatch = !searchTerm || receipt.awb.toLowerCase().includes(searchTerm.toLowerCase());
            return channelMatch && searchMatch;
        });
    }, [allReturnsForMonth, activeChannel, searchTerm]);
    
    const paginatedReturns = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReturns.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReturns, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

    const handleChangeStatus = async (id: number, newStatus: string) => {
        try {
            await updateShippingReceiptStatus(id, newStatus);
            toast({ title: t.statusUpdateSuccess, description: t.statusUpdateSuccessDesc.replace('{status}', newStatus) });
        } catch (error) {
            toast({ variant: 'destructive', title: t.statusUpdateError });
        }
    };
    
    const handleDelete = async (receiptToDelete: ShippingReceipt) => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: t.deleteSuccess, description: t.deleteSuccessDesc.replace('{awb}', receiptToDelete.awb) });
        } catch (error) {
            toast({ variant: 'destructive', title: t.deleteError });
        }
    };

    const handleActionClick = (receipt: ShippingReceipt) => {
        if (!receipt.transactionId) {
            toast({
                variant: 'destructive',
                title: 'Transaksi Tidak Tertaut',
                description: 'Resi ini tidak terhubung ke transaksi penjualan. Tidak dapat memproses secara otomatis.'
            });
            return;
        }
        setSelectedReceipt(receipt);
        setIsProductSelectionDialogOpen(true);
    };
    
    const handleProcessReturn = async (transactionId: string, returnedItems: ReturnedItem[]) => {
        try {
            await returnSaleTransaction(transactionId);
            
            if (selectedReceipt) {
                const finalStatus = selectedReceipt.status === 'Dibatalkan' ? 'Selesai' : 'Return Selesai';
                await handleChangeStatus(selectedReceipt.id, finalStatus);
            }

            toast({ title: t.stockReturnedSuccess, description: `Stok untuk ${returnedItems.length} produk telah dikembalikan.` });
        } catch (error) {
            let errorMessage = t.stockReturnedError;
             if (error instanceof Error) {
                if (error.message.includes('Sale item not found in transaction')) {
                    errorMessage = "Item yang di-scan tidak ditemukan di transaksi penjualan asli.";
                } else if (error.message.includes('TRANSACTION_NOT_FOUND')) {
                    errorMessage = "Transaksi penjualan tidak ditemukan. Stok tidak dapat dikembalikan secara otomatis.";
                } else {
                    errorMessage = error.message;
                }
            }
            toast({ variant: 'destructive', title: 'Gagal Memproses', description: errorMessage });
            throw error;
        }
    };
    
    const downloadExcel = useCallback(() => {
        setIsDownloading(true);
        const { id, update } = toast({ title: 'Memulai unduhan', description: 'Laporan Excel sedang disiapkan...' });

        setTimeout(() => {
            const dataToExport = filteredReturns.map(item => ({
                'No. Resi': item.awb,
                'Tanggal': format(parseISO(item.date), 'dd MMM yyyy HH:mm'),
                'Kanal': item.channel,
                'Status': item.status
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Return');

            const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM-yyyy', { locale: localeId });
            const fileName = `Laporan_Return_${monthName}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            update({
                id,
                title: "Unduhan Siap",
                description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
            });
            setIsDownloading(false);
        }, 500);
    }, [filteredReturns, selectedMonth, selectedYear, toast]);

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
                                placeholder="Cari No. Resi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-9 w-full md:w-48"
                            />
                        </div>
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-[150px] h-9">
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
                            <SelectTrigger className="w-[100px] h-9">
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
                        <Button onClick={downloadExcel} variant="outline" size="sm" disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isDownloading ? 'Mengekspor...' : 'Download Laporan'}
                        </Button>
                    </div>
                </div>
                 <div className="flex flex-col gap-2">
                     <div className="border-b">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            <Button 
                                variant={activeChannel === null ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveChannel(null)}
                                className="shrink-0"
                            >
                                Semua
                                {loading ? (
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                ) : (
                                     <Badge variant={activeChannel === null ? 'default' : 'secondary'} className="ml-2">
                                        {Object.values(channelCounts).reduce((a,b) => a+b, 0)}
                                    </Badge>
                                )}
                            </Button>
                            {(['SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'] as const).map(tab => (
                                channelCounts[tab] > 0 && <Button 
                                    key={tab}
                                    variant={activeChannel === tab ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveChannel(tab)}
                                    className="shrink-0"
                                >
                                    {tab}
                                    {loading ? (
                                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    ) : (
                                         <Badge variant={activeChannel === tab ? 'default' : 'secondary'} className="ml-2">
                                            {channelCounts[tab]}
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="grid gap-6">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.table.awb}</TableHead>
                                        <TableHead>{t.table.date}</TableHead>
                                        <TableHead>{t.table.channel}</TableHead>
                                        <TableHead>{t.table.status}</TableHead>
                                        <TableHead className="text-center">{t.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="h-48 text-center">{t.loading}</TableCell></TableRow>
                                    ) : paginatedReturns.length > 0 ? paginatedReturns.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.status === 'Return' && (
                                                    <Button variant="outline" size="sm" onClick={() => handleActionClick(item)}>
                                                        <CheckCircle className="mr-2 h-3 w-3 text-green-500" />
                                                        {t.actions.itemArrived}
                                                    </Button>
                                                )}
                                                {item.status === 'Dibatalkan' && (
                                                    <Button variant="outline" size="sm" onClick={() => handleActionClick(item)}>
                                                        <Undo2 className="mr-2 h-3 w-3" />
                                                        Proses Pembatalan
                                                    </Button>
                                                )}
                                                {['Return Selesai', 'Selesai'].includes(item.status) && (
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                             <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                                                <Trash2 className="h-4 w-4" />
                                                             </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t.deleteConfirmDesc.replace('{awb}', item.awb)}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{tCommon.cancel}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive hover:bg-destructive/90">
                                                                    {t.deleteConfirmAction}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Package className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noReturnsTitle}</p>
                                                    <p className="text-sm">{t.noReturnsDesc}</p>
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
            <ReturnProductDialog
                open={isProductSelectionDialogOpen}
                onOpenChange={setIsProductSelectionDialogOpen}
                onProcessReturn={handleProcessReturn}
                receipt={selectedReceipt}
                dialogTitle={selectedReceipt?.status === 'Dibatalkan' ? 'Proses Pembatalan' : 'Proses Barang Return'}
                dialogDescription={selectedReceipt?.status === 'Dibatalkan' ? 'Periksa barang yang stoknya akan dikembalikan' : 'Periksa barang yang telah kembali ke gudang'}
                submitText={selectedReceipt?.status === 'Dibatalkan' ? 'Proses Pembatalan' : 'Proses Pengembalian'}
            />
        </AppLayout>
    );
}

    

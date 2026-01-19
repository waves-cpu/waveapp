
'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale, Reseller } from '@/types';
import { AppLayout } from '@/app/components/app-layout';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id as aing } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Trash2, Printer, Clock, FileText } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { History as HistoryIcon } from 'lucide-react';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { PosReceipt, type ReceiptData } from '@/app/components/pos-receipt';
import { AccessoryUsageVoucher, type VoucherData } from '@/app/components/accessory-usage-voucher';
import type { CartItem } from '@/app/components/pos-cart';
import { useRouter } from 'next/navigation';
import { formatToWIB } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ResellerInvoice, type InvoiceData } from '@/app/components/reseller-invoice';


type GroupedSale = {
    transactionId: string;
    saleDate: string;
    items: Sale[];
    totalAmount: number;
    totalItems: number;
    paymentMethod?: string;
    isAccessoryUsage: boolean;
    status?: string;
    resellerId?: number;
    resellerName?: string | null;
}

const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'success';
        case 'dibatalkan':
            return 'destructive';
        case 'pending':
            return 'warning';
        default:
            return 'outline';
    }
};

export default function PosHistoryPage() {
    const { cancelSaleTransaction, clearPosTransactions, loadPendingTransaction, fetchItems } = useInventory();
    const { language } = useLanguage();
    const { toast } = useToast();
    const t = translations[language];
    const router = useRouter();

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [historyData, setHistoryData] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedSaleItems, setSelectedSaleItems] = useState<Sale[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [receiptToPrint, setReceiptToPrint] = useState<ReceiptData | null>(null);
    const [voucherToPrint, setVoucherToPrint] = useState<VoucherData | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceData | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!date) return;
        setLoading(true);
        try {
            const data = await apiFetch<Sale[]>(`/api/sales/pos-history?date=${date.toISOString()}`);
            setHistoryData(data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Memuat Riwayat',
                description: 'Tidak dapat mengambil data transaksi untuk tanggal yang dipilih.',
            });
            setHistoryData([]);
        } finally {
            setLoading(false);
        }
    }, [date, toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);


    const groupedSales = useMemo((): GroupedSale[] => {
        const groups = new Map<string, GroupedSale>();

        historyData.forEach(sale => {
            const id = sale.transactionId || `sale-${sale.id}`;

            if (!groups.has(id)) {
                groups.set(id, {
                    transactionId: id,
                    saleDate: sale.saleDate,
                    paymentMethod: sale.paymentMethod,
                    status: sale.status,
                    items: [],
                    totalAmount: 0,
                    totalItems: 0,
                    isAccessoryUsage: false, // will be updated later
                    resellerId: sale.resellerId,
                    resellerName: sale.resellerName,
                });
            }

            const group = groups.get(id)!;
            group.items.push(sale);
            group.totalAmount += sale.priceAtSale * sale.quantity;
            group.totalItems += sale.quantity;
        });

        // Determine if it's an accessory usage transaction
        groups.forEach(group => {
            group.isAccessoryUsage = group.items.length > 0 && group.items.every(item => item.accessoryId);
        });

        return Array.from(groups.values()).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [historyData]);

    const handleCancelTransaction = useCallback(async (transactionId: string) => {
        try {
            await cancelSaleTransaction(transactionId);
            toast({
                title: "Transaksi Dibatalkan",
                description: "Stok telah dikembalikan dan transaksi ditandai sebagai 'Dibatalkan'.",
            });
            await fetchHistory();
            await fetchItems();
        } catch (error) {
            console.error("Error cancelling transaction:", error);
            toast({
                variant: 'destructive',
                title: "Gagal Membatalkan",
                description: "Terjadi kesalahan saat membatalkan transaksi.",
            });
        }
    }, [cancelSaleTransaction, toast, fetchHistory, fetchItems]);
    
    const handleClearHistory = async () => {
        if (!date) return;
        try {
            await clearPosTransactions(date);
            toast({
                title: "Riwayat Dibersihkan",
                description: `Semua transaksi POS untuk tanggal ${formatToWIB(date, 'PPP')} telah dihapus dan stok telah dikembalikan.`,
            });
             await fetchHistory();
             await fetchItems();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Membersihkan Riwayat",
                description: "Terjadi kesalahan saat membersihkan riwayat transaksi.",
            });
        }
    }


    const handleViewDetails = (items: Sale[]) => {
        setSelectedSaleItems(items);
        setIsDetailOpen(true);
    };

    const handleRowClick = (group: GroupedSale) => {
        handleViewDetails(group.items);
    }
    
    const triggerPrint = (group: GroupedSale) => {
        const cartItems: CartItem[] = group.items.map(item => ({
            id: item.accessoryId?.toString() || item.variantId?.toString() || item.productId!.toString(),
            productId: item.productId?.toString() || item.accessoryId?.toString() || '',
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku!,
            quantity: item.quantity,
            price: item.priceAtSale,
            originalPrice: item.priceAtSale, // Reprint doesn't have original price context
            category: item.productCategory,
            imageUrl: item.parentImageUrl,
            type: item.accessoryId ? 'accessory' : 'product',
            maxStock: 0, // Not relevant for reprint
        }));

        if (group.resellerId && group.resellerName) {
            setInvoiceToPrint({
                items: cartItems,
                subtotal: group.totalAmount,
                discount: 0, // No discount info on reprint
                total: group.totalAmount,
                transactionId: group.transactionId,
                reseller: {
                    id: group.resellerId,
                    name: group.resellerName,
                    createdAt: '', // Not needed for printing
                },
            });
        } else if (group.isAccessoryUsage) {
             setVoucherToPrint({
                items: cartItems,
                transactionId: group.transactionId,
                date: new Date(group.saleDate),
            });
        } else {
             const receiptData: ReceiptData = {
                items: cartItems,
                subtotal: group.totalAmount,
                discount: 0, // Reprint doesn't have discount context
                total: group.totalAmount,
                paymentMethod: group.paymentMethod || 'N/A',
                cashReceived: group.totalAmount, // For non-cash, cash received equals total
                change: 0,
                transactionId: group.transactionId,
            };
            setReceiptToPrint(receiptData);
        }
    };

    useEffect(() => {
        if (receiptToPrint || voucherToPrint || invoiceToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setReceiptToPrint(null);
                setVoucherToPrint(null);
                setInvoiceToPrint(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [receiptToPrint, voucherToPrint, invoiceToPrint]);


    return (
        <>
        <AppLayout>
            <main className="flex-1 p-4 md:p-10 no-print">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.pos.history}</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <Link href="/sales/pos">
                             <Button variant="outline">{t.pos.title}</Button>
                        </Link>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={'outline'}
                                className="w-[240px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? formatToWIB(date, 'PPP', { locale: language === 'id' ? aing : undefined }) : <span>Pilih tanggal</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={groupedSales.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Bersihkan Riwayat
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Anda yakin ingin membersihkan riwayat?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menghapus semua {groupedSales.length} transaksi POS untuk tanggal {date ? formatToWIB(date, 'PPP') : ''} dan mengembalikan stok. Aksi ini tidak dapat diurungkan.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                                        Ya, Bersihkan
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Waktu</TableHead>
                                    <TableHead className="text-xs">Detail Transaksi</TableHead>
                                    <TableHead className="text-xs">Metode Bayar</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-right text-xs">Total</TableHead>
                                    <TableHead className="text-center text-xs">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : groupedSales.length > 0 ? (
                                    groupedSales.map(group => (
                                        <TableRow key={group.transactionId} onClick={() => handleRowClick(group)} className="cursor-pointer">
                                            <TableCell className="font-medium text-sm">
                                                {formatToWIB(new Date(group.saleDate), 'HH:mm:ss')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">
                                                    {group.isAccessoryUsage ? 'Pemakaian Aksesoris' : (group.resellerName ? `Reseller: ${group.resellerName}` : group.items[0]?.productName || 'N/A')}
                                                    {!group.isAccessoryUsage && !group.resellerName && ` ${group.items[0]?.variantName || ''}`}
                                                </div>
                                                {group.items.length > 1 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        + {group.items.length - 1} {group.isAccessoryUsage ? 'aksesoris' : 'produk'} lainnya
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {group.isAccessoryUsage ? 'Pemakaian Internal' : group.paymentMethod || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(group.status)}>
                                                    {group.status || 'Completed'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-sm">
                                                {group.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => triggerPrint(group)}>
                                                    {group.resellerId ? <FileText className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" disabled={group.status === 'Dibatalkan'}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Batalkan Transaksi Ini?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Stok untuk item dalam transaksi ini akan dikembalikan. Transaksi akan ditandai sebagai 'Dibatalkan' dan tidak dapat diubah lagi.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCancelTransaction(group.transactionId)} className="bg-destructive hover:bg-destructive/90">
                                                                Ya, Batalkan Transaksi
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <HistoryIcon className="h-12 w-12" />
                                                <p className="font-semibold text-sm">Tidak Ada Transaksi</p>
                                                <p className="text-xs">Tidak ada transaksi yang tercatat pada tanggal yang dipilih.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </main>

             <DailySalesDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                sales={selectedSaleItems}
                title="Detail Transaksi"
                description={`Detail item untuk transaksi #${selectedSaleItems[0]?.transactionId?.slice(-6) ?? 'N/A'}`}
            />
        </AppLayout>
        <div className="print-only">
            {receiptToPrint && <PosReceipt ref={null} receipt={receiptToPrint} />}
        </div>
        <div className="print-only-a4">
             {voucherToPrint && <AccessoryUsageVoucher ref={null} voucher={voucherToPrint} />}
             {invoiceToPrint && <ResellerInvoice ref={null} invoice={invoiceToPrint} />}
        </div>
        </>
    );
}
    


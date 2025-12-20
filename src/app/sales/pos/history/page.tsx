
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
import { format } from 'date-fns';
import { id as aing } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Trash2, Printer } from 'lucide-react';
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


type GroupedSale = {
    transactionId: string;
    saleDate: string;
    items: Sale[];
    totalAmount: number;
    totalItems: number;
    paymentMethod?: string;
}

export default function PosHistoryPage() {
    const { allSales, fetchItems, cancelSaleTransaction, loading } = useInventory();
    const { language } = useLanguage();
    const { toast } = useToast();
    const t = translations[language];

    const [date, setDate] = useState<Date | undefined>(undefined);
    const [selectedSaleItems, setSelectedSaleItems] = useState<Sale[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [receiptToPrint, setReceiptToPrint] = useState<ReceiptData | null>(null);
    const [voucherToPrint, setVoucherToPrint] = useState<VoucherData | null>(null);

    useEffect(() => {
        setDate(new Date());
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    
    const posSales = useMemo(() => {
        const filtered = allSales.filter(s => s.channel === 'pos');
        if (date) {
            const selectedDateString = format(date, 'yyyy-MM-dd');
            return filtered.filter(s => format(new Date(s.saleDate), 'yyyy-MM-dd') === selectedDateString);
        }
        return filtered;
    }, [allSales, date]);


    const groupedSales = useMemo((): GroupedSale[] => {
        const groups = new Map<string, GroupedSale>();

        posSales.forEach(sale => {
            const id = sale.transactionId || `sale-${sale.id}`;

            if (!groups.has(id)) {
                groups.set(id, {
                    transactionId: id,
                    saleDate: sale.saleDate,
                    paymentMethod: sale.paymentMethod,
                    items: [],
                    totalAmount: 0,
                    totalItems: 0,
                });
            }

            const group = groups.get(id)!;
            group.items.push(sale);
            group.totalAmount += sale.priceAtSale * sale.quantity;
            group.totalItems += sale.quantity;
        });

        return Array.from(groups.values()).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [posSales]);

    const handleCancelTransaction = useCallback(async (transactionId: string) => {
        try {
            await cancelSaleTransaction(transactionId);
            toast({
                title: t.pos.transactionCancelled,
                description: "Stok telah dikembalikan.",
            });
            await fetchItems(); // Refetch all data to update UI
        } catch (error) {
            console.error("Error cancelling transaction:", error);
            toast({
                variant: 'destructive',
                title: "Gagal Membatalkan",
                description: "Terjadi kesalahan saat membatalkan transaksi.",
            });
        }
    }, [cancelSaleTransaction, t.pos.transactionCancelled, toast, fetchItems]);

    const handleViewDetails = (items: Sale[]) => {
        setSelectedSaleItems(items);
        setIsDetailOpen(true);
    };
    
    const triggerPrint = (group: GroupedSale) => {
        const cartItems: CartItem[] = group.items.map(item => ({
            id: item.accessoryId?.toString() || item.variantId?.toString() || item.productId!.toString(),
            productId: item.productId?.toString() || item.accessoryId!.toString(),
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku!,
            quantity: item.quantity,
            price: item.priceAtSale,
            type: item.accessoryId ? 'accessory' : 'product',
            maxStock: 0, // Not relevant for reprint
        }));

        const isAccessoryOnly = cartItems.every(item => item.type === 'accessory');

        if (isAccessoryOnly) {
             setVoucherToPrint({
                items: cartItems,
                transactionId: group.transactionId,
                date: new Date(group.saleDate),
            });
        } else {
             const receiptData: ReceiptData = {
                items: cartItems,
                subtotal: group.totalAmount,
                discount: 0, // Assuming no discount data is stored for reprint
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
        if (receiptToPrint || voucherToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setReceiptToPrint(null);
                setVoucherToPrint(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [receiptToPrint, voucherToPrint]);


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
                                {date ? format(date, 'PPP', { locale: language === 'id' ? aing : undefined }) : <span>Pilih tanggal</span>}
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
                                    <TableHead className="text-right text-xs">Total</TableHead>
                                    <TableHead className="text-center text-xs">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-sm">Memuat riwayat...</TableCell>
                                    </TableRow>
                                ) : groupedSales.length > 0 ? (
                                    groupedSales.map(group => (
                                        <TableRow key={group.transactionId}>
                                            <TableCell className="font-medium text-sm" onClick={() => handleViewDetails(group.items)}>
                                                {format(new Date(group.saleDate), 'HH:mm:ss')}
                                            </TableCell>
                                            <TableCell onClick={() => handleViewDetails(group.items)}>
                                                <div className="font-medium text-sm">{group.items[0].productName} {group.items[0].variantName || ''}</div>
                                                {group.items.length > 1 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        + {group.items.length - 1} produk lainnya
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell onClick={() => handleViewDetails(group.items)}>
                                                <Badge variant="outline">{group.paymentMethod || 'N/A'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-sm" onClick={() => handleViewDetails(group.items)}>
                                                {group.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => triggerPrint(group)}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Anda yakin ingin membatalkan transaksi ini?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Tindakan ini akan mengembalikan stok untuk semua item dalam transaksi ini. Aksi ini tidak dapat diurungkan.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCancelTransaction(group.transactionId)}>
                                                                Ya, Batalkan
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
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
        </div>
        </>
    );
}

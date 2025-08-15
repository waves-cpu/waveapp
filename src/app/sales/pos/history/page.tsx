
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Trash2, ShoppingCart, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import type { Sale } from '@/types';
import { useToast } from '@/hooks/use-toast';
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
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { id as indonesiaLocale } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface GroupedSale {
    transactionId: string;
    saleDate: Date;
    totalAmount: number;
    totalItems: number;
    items: Sale[];
}

export default function PosHistoryPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { fetchSales, cancelSaleTransaction } = useInventory();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [groupedSales, setGroupedSales] = useState<GroupedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(new Set());

  const toggleCollapsible = (transactionId: string) => {
    setOpenCollapsibles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(transactionId)) {
            newSet.delete(transactionId);
        } else {
            newSet.add(transactionId);
        }
        return newSet;
    });
  };

  const loadSales = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      const salesData = await fetchSales('pos', selectedDate);
      
      const salesByTransaction = new Map<string, GroupedSale>();

      salesData.forEach(sale => {
          const txId = sale.transactionId!;
          if (!salesByTransaction.has(txId)) {
              salesByTransaction.set(txId, {
                  transactionId: txId,
                  saleDate: new Date(sale.saleDate),
                  totalAmount: 0,
                  totalItems: 0,
                  items: [],
              });
          }
          const tx = salesByTransaction.get(txId)!;
          tx.items.push(sale);
          tx.totalAmount += sale.priceAtSale * sale.quantity;
          tx.totalItems += sale.quantity;
      });

      setGroupedSales(Array.from(salesByTransaction.values()).sort((a,b) => b.saleDate.getTime() - a.saleDate.getTime()));
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Penjualan',
        description: 'Terjadi kesalahan saat mengambil data penjualan.',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchSales, toast]);

  useEffect(() => {
    // Set initial date on client to avoid hydration mismatch
    setDate(new Date());
  }, []);

  useEffect(() => {
    if (date) {
      loadSales(date);
    }
  }, [date, loadSales]);
  
  const handleCancelTransaction = async (transactionId: string) => {
    if (!date) return;
    try {
        await cancelSaleTransaction(transactionId);
        toast({
            title: 'Transaksi Dibatalkan',
            description: 'Transaksi telah berhasil dibatalkan dan stok dikembalikan.',
        });
        loadSales(date);
    } catch (error) {
        console.error('Failed to cancel sale:', error);
        toast({
            variant: 'destructive',
            title: 'Gagal Membatalkan',
            description: 'Terjadi kesalahan saat membatalkan transaksi.',
        });
    }
  };


  return (
    <main className="flex flex-col h-screen bg-muted/40">
        <header className="flex items-center justify-between p-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                  <Link href="/sales/pos">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Kembali ke POS</span>
                  </Link>
              </Button>
              <h1 className="text-lg font-bold font-headline text-primary">Riwayat Penjualan POS</h1>
          </div>
          <Popover>
            <PopoverTrigger asChild>
                <Button
                id="date"
                variant={'outline'}
                className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP', { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => setDate(newDate || new Date())}
                initialFocus
                />
            </PopoverContent>
          </Popover>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="bg-card rounded-lg border shadow-sm">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead>No. Transaksi</TableHead>
                        <TableHead>Total Item</TableHead>
                        <TableHead>Total Belanja</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 10 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : groupedSales.length > 0 ? (
                        groupedSales.map((sale) => (
                            <Collapsible asChild key={sale.transactionId} open={openCollapsibles.has(sale.transactionId)} onOpenChange={() => toggleCollapsible(sale.transactionId)}>
                                <>
                                    <TableRow className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    {openCollapsibles.has(sale.transactionId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </CollapsibleTrigger>
                                        </TableCell>
                                        <TableCell>{format(sale.saleDate, 'HH:mm:ss')}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{sale.transactionId}</Badge>
                                        </TableCell>
                                        <TableCell>{sale.totalItems} item</TableCell>
                                        <TableCell className="font-semibold">{`Rp${sale.totalAmount.toLocaleString('id-ID')}`}</TableCell>
                                        <TableCell className="text-center">
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
                                                        Tindakan ini akan membatalkan seluruh transaksi <span className='font-bold'>{sale.transactionId}</span> dan mengembalikan stok semua item di dalamnya. Tindakan ini tidak dapat diurungkan.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCancelTransaction(sale.transactionId)}>
                                                        Ya, Batalkan Transaksi
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    <CollapsibleContent asChild>
                                        <tr className='bg-muted/30'>
                                            <td colSpan={6} className='p-0'>
                                                <div className='p-4'>
                                                    <h4 className="font-semibold mb-2">Detail Item:</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Produk</TableHead>
                                                                <TableHead>SKU</TableHead>
                                                                <TableHead className='text-center'>Jumlah</TableHead>
                                                                <TableHead className='text-right'>Harga Satuan</TableHead>
                                                                <TableHead className='text-right'>Subtotal</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                        {sale.items.map(item => (
                                                            <TableRow key={item.id} className='hover:bg-background'>
                                                                <TableCell>{item.productName}{item.variantName && <span className="text-muted-foreground text-xs ml-2">({item.variantName})</span>}</TableCell>
                                                                <TableCell>{item.sku}</TableCell>
                                                                <TableCell className='text-center'>{item.quantity}</TableCell>
                                                                <TableCell className='text-right'>{`Rp${item.priceAtSale.toLocaleString('id-ID')}`}</TableCell>
                                                                <TableCell className='text-right'>{`Rp${(item.priceAtSale * item.quantity).toLocaleString('id-ID')}`}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </td>
                                        </tr>
                                    </CollapsibleContent>
                                </>
                            </Collapsible>
                        ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                <ShoppingCart className="h-16 w-16" />
                                <div className="text-center">
                                    <p className="font-semibold">Tidak Ada Penjualan</p>
                                    <p className="text-sm">Tidak ada penjualan yang tercatat pada tanggal yang dipilih.</p>
                                </div>
                            </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </div>
    </main>
  );
}


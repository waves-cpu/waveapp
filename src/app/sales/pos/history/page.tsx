
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
import { Calendar as CalendarIcon, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
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

export default function PosHistoryPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { fetchSales, cancelSale } = useInventory();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      const salesData = await fetchSales('pos', selectedDate);
      setSales(salesData);
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
  
  const handleCancelSale = async (saleId: string) => {
    if (!date) return;
    try {
        await cancelSale(saleId);
        toast({
            title: 'Penjualan Dibatalkan',
            description: 'Penjualan telah berhasil dibatalkan dan stok dikembalikan.',
        });
        loadSales(date);
    } catch (error) {
        console.error('Failed to cancel sale:', error);
        toast({
            variant: 'destructive',
            title: 'Gagal Membatalkan',
            description: 'Terjadi kesalahan saat membatalkan penjualan.',
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
                    <TableHead>Waktu</TableHead>
                    <TableHead className="w-[40%]">Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell className="text-center">
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </TableCell>
                        </TableRow>
                    ))
                    ) : sales.length > 0 ? (
                    sales.map((sale) => (
                        <TableRow key={sale.id}>
                        <TableCell>{format(new Date(sale.saleDate), 'HH:mm:ss')}</TableCell>
                        <TableCell>
                            {sale.productName}
                            {sale.variantName && <span className="text-muted-foreground text-xs ml-2">{sale.variantName}</span>}
                        </TableCell>
                        <TableCell>{sale.sku}</TableCell>
                        <TableCell>{`Rp${Math.round(sale.priceAtSale).toLocaleString('id-ID')}`}</TableCell>
                        <TableCell className="text-center">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini akan membatalkan penjualan dan mengembalikan stok. Tindakan ini tidak dapat diurungkan.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelSale(sale.id)}>
                                    Ya, Batalkan Penjualan
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


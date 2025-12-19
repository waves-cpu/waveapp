'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar as CalendarIcon, ScanLine, Trash2, ShoppingCart, Search, Eye } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale, ShippingReceipt } from '@/types';
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
import { AppLayout } from '@/app/components/app-layout';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { useParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { Badge } from '@/components/ui/badge';
import { RecordSaleForReceiptDialog } from '@/app/components/record-sale-for-receipt-dialog';


export default function TiktokSalesPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { addShippingReceipt, deleteShippingReceipt, fetchShippingReceipts, allSales, fetchItems } = useInventory();
  const { toast } = useToast();
  const { playSuccessSound, playErrorSound } = useScanSounds();
  const router = useRouter();

  const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [awb, setAwb] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const awbInputRef = useRef<HTMLInputElement>(null);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [detailItems, setDetailItems] = useState<Sale[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [receiptForSale, setReceiptForSale] = useState<ShippingReceipt | null>(null);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());

  const refocusInput = useCallback(() => {
    if (!isSaleDialogOpen) {
      setTimeout(() => awbInputRef.current?.focus(), 100);
    }
  }, [isSaleDialogOpen]);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const { receipts: receiptsData, total } = await fetchShippingReceipts({ 
          page: currentPage, 
          limit: itemsPerPage, 
          salesChannel: 'Tiktok', 
          dateString: dateString,
          awb: searchTerm
      });
      setReceipts(receiptsData);
      setTotalReceipts(total);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Memuat Resi',
        description: 'Terjadi kesalahan saat mengambil data resi.',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchShippingReceipts, toast, currentPage, itemsPerPage, searchTerm, currentDate]);
  
  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);
  
  useEffect(() => {
    refocusInput();
  }, [refocusInput, receipts, isSaleDialogOpen]);
  
  useEffect(() => {
    fetchItems(); // Ensure items are fresh for the sale dialog
  }, [fetchItems]);


  const salesByReceipt = useMemo(() => {
    const map = new Map<string, Sale[]>();
    allSales.forEach(sale => {
      const key = sale.transactionId;
      if (key) {
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(sale);
      }
    });
    return map;
  }, [allSales]);


  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
        setDatePickerOpen(false);
        setCurrentDate(newDate);
        setCurrentPage(1);
    }
  }

  const handleAwbSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!awb || isSubmitting) return;

    setIsSubmitting(true);
    
     const newReceipt: Omit<ShippingReceipt, 'id'> = {
        awb: awb.trim(),
        salesChannel: 'Tiktok',
        channel: 'J&T', // Default to J&T for Tiktok
        date: format(currentDate, "yyyy-MM-dd'T'HH:mm:ss"),
        status: 'Perlu Diproses',
        transactionId: awb.trim()
    };

    try {
        const added = await addShippingReceipt(newReceipt);
        playSuccessSound();
        setAwb('');
        setReceiptForSale(added);
        setIsSaleDialogOpen(true);
    } catch (error) {
        playErrorSound();
        let title = 'Input Gagal';
        let errorMessage = 'Gagal menyimpan resi.';
        if (error instanceof Error && error.message.startsWith('DUPLICATE_AWB_DATE::')) {
            const dateStr = error.message.split('::')[1];
            title = 'Resi Duplikat';
            errorMessage = `Resi ini sudah discan pada ${format(parseISO(dateStr), 'dd MMM yyyy, HH:mm')}`;
        }
        toast({ variant: 'destructive', title: title, description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteReceipt = async (id: number) => {
    try {
        await deleteShippingReceipt(id);
        toast({
            title: 'Resi Dihapus',
            description: 'Resi telah berhasil dihapus.',
        });
        loadReceipts();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus', description: 'Terjadi kesalahan.' });
    }
  };
  
  const handleViewDetails = (receipt: ShippingReceipt) => {
    if (!receipt.transactionId) return;
    const items = salesByReceipt.get(receipt.transactionId) || [];
    if (items.length > 0) {
        setDetailItems(items);
        setIsDetailOpen(true);
    } else {
        setReceiptForSale(receipt);
        setIsSaleDialogOpen(true);
    }
  }
  
  const totalPages = Math.ceil(totalReceipts / itemsPerPage);

  return (
    <AppLayout>
      <main className="flex min-h-svh flex-1 flex-col gap-4 bg-muted/40 p-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
            {t.sales.tiktok}
          </h1>
        </div>

        <div className="bg-card rounded-lg border shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
              <form onSubmit={handleAwbSubmit} className="flex-grow md:max-w-sm">
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          ref={awbInputRef}
                          placeholder="Scan atau masukkan No. Resi (AWB), lalu Enter"
                          value={awb}
                          onChange={(e) => setAwb(e.target.value)}
                          className="pl-10 w-full"
                          disabled={isSubmitting || isSaleDialogOpen}
                          autoFocus
                      />
                  </div>
              </form>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Resi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        'w-full sm:w-[240px] justify-start text-left font-normal',
                        !currentDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentDate ? format(currentDate, 'PP') : <span>{t.stockHistory.dateRange}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
          </div>
          <div className="flex-grow overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[200px]">Waktu Scan</TableHead>
                  <TableHead>No. Resi (AWB)</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                          <TableCell className="text-center">
                              <Skeleton className="h-8 w-8 rounded-md" />
                          </TableCell>
                      </TableRow>
                  ))
                ) : receipts.length > 0 ? (
                  receipts.map((receipt) => {
                    const relatedSales = salesByReceipt.get(receipt.transactionId || '') || [];
                    return (
                        <TableRow key={receipt.id}>
                          <TableCell>{format(new Date(receipt.date), 'HH:mm:ss')}</TableCell>
                          <TableCell className="font-medium">{receipt.awb}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleViewDetails(receipt)}>
                                {relatedSales.length > 0 ? `${relatedSales.reduce((acc, s) => acc + s.quantity, 0)} produk` : 'Catat Produk'}
                                <Eye className="ml-2 h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{receipt.status}</Badge></TableCell>
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
                                      Tindakan ini akan menghapus resi dan semua data penjualan terkait. Stok akan dikembalikan. Aksi ini tidak dapat diurungkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteReceipt(receipt.id)}>
                                      Ya, Hapus Resi
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                              <ShoppingCart className="h-16 w-16" />
                              <div className="text-center">
                                  <p className="font-semibold">Tidak Ada Resi</p>
                                  <p className="text-sm">Tidak ada resi yang tercatat pada tanggal yang dipilih.</p>
                              </div>
                          </div>
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="flex items-center justify-end p-4 border-t">
                    <div className="flex items-center gap-4">
                        <Pagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      <DailySalesDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          sales={detailItems}
      />
      <RecordSaleForReceiptDialog
        open={isSaleDialogOpen}
        onOpenChange={(isOpen) => {
          setIsSaleDialogOpen(isOpen);
          if (!isOpen) {
            setReceiptForSale(null);
            loadReceipts(); 
          }
        }}
        receipt={receiptForSale}
      />
    </AppLayout>
  );
}

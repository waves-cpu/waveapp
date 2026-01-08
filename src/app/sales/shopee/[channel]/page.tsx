
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
import { ScanLine, ShoppingCart, Search, Eye, ArrowLeft, MoreVertical, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/app/components/app-layout';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { useParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { Badge } from '@/components/ui/badge';
import { RecordSaleForReceiptDialog } from '@/app/components/record-sale-for-receipt-dialog';
import { apiFetch } from '@/lib/api';


function DatePickerClient({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date | undefined,
  onDateChange: (date: Date | undefined) => void,
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={'outline'}
          className={cn(
            'w-full sm:w-[240px] justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isClient && selectedDate ? format(selectedDate, 'PPP') : <span>Pilih tanggal</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const TableSkeleton = () => (
    <>
        {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
            </TableRow>
        ))}
    </>
);

const EmptyState = ({ searchTerm }: { searchTerm: string }) => (
     <TableRow>
        <TableCell colSpan={4} className="h-48 text-center">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <ShoppingCart className="h-16 w-16" />
                <div className="text-center">
                    <p className="font-semibold">Tidak Ada Resi</p>
                    <p className="text-sm">
                         {searchTerm ? `Tidak ada resi yang cocok dengan pencarian "${searchTerm}".` : "Belum ada resi yang tercatat untuk hari ini."}
                    </p>
                </div>
            </div>
        </TableCell>
    </TableRow>
);


export function useReceiptPageLogic(salesChannel: 'Shopee' | 'Tiktok' | 'Lazada') {
    const params = useParams();
    const router = useRouter();
    const inventoryContext = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, playNotificationSound } = useScanSounds();
    const { language } = useLanguage();
    const t = translations[language];

    const shippingChannel = typeof params.channel === 'string' ? decodeURIComponent(params.channel).toUpperCase() : '';

    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [awb, setAwb] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const awbInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const [detailItems, setDetailItems] = useState<Sale[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [receiptForSale, setReceiptForSale] = useState<Omit<ShippingReceipt, 'id'> | ShippingReceipt | null>(null);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    
    const refocusInput = useCallback(() => {
        if (!isSaleDialogOpen) {
            setTimeout(() => awbInputRef.current?.focus(), 100);
        }
    }, [isSaleDialogOpen]);

    const loadReceipts = useCallback(async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            const { receipts: receiptsData, total } = await inventoryContext.fetchShippingReceipts({ 
                page: currentPage, 
                limit: itemsPerPage, 
                salesChannel: salesChannel,
                channel: shippingChannel, 
                awb: searchTerm,
                dateString: dateString
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
    }, [inventoryContext, toast, currentPage, itemsPerPage, searchTerm, salesChannel, shippingChannel, selectedDate]);
    
    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);
    
    useEffect(() => {
      const eventSource = new EventSource('/api/stream');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new-receipt' && data.channel === shippingChannel && data.salesChannel === salesChannel) {
          playNotificationSound();
          setReceipts(prev => [data.payload, ...prev].slice(0, itemsPerPage));
          setTotalReceipts(prev => prev + 1);
        }
      };

      eventSource.onerror = () => {};

      return () => {
        eventSource.close();
      };
    }, [shippingChannel, salesChannel, itemsPerPage, playNotificationSound]);

    useEffect(() => {
        refocusInput();
    }, [refocusInput, receipts, isSaleDialogOpen]);
    
    const handleAwbSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedAwb = awb.trim().toUpperCase();
        
        if (!trimmedAwb || trimmedAwb.length < 5 || isSubmitting) return;
    
        setIsSubmitting(true);
        
        try {
            const existingReceipt = await inventoryContext.findShippingReceiptByAwb(trimmedAwb);

            if (existingReceipt) {
                playErrorSound();
                toast({
                    variant: "destructive",
                    title: 'Resi Sudah Ada',
                    description: `AWB ${trimmedAwb} sudah diinput pada ${formatToWIB(parseISO(existingReceipt.date), 'dd/MM/yyyy HH:mm')}`
                });
                setAwb('');
                return;
            }

            const newReceipt: Omit<ShippingReceipt, 'id'> = {
                awb: trimmedAwb,
                salesChannel: salesChannel,
                channel: shippingChannel,
                date: new Date().toISOString(),
                status: 'Perlu Diproses',
                transactionId: trimmedAwb
            };
            
            setReceiptForSale(newReceipt);
            setIsSaleDialogOpen(true);
            setAwb('');
            playSuccessSound();

        } catch (error: any) {
            playErrorSound();
            toast({ variant: "destructive", title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = async (receipt: ShippingReceipt) => {
        // If status is not "Perlu Diproses", it means sale is recorded.
        if (receipt.status !== 'Perlu Diproses') {
            try {
                const data = await apiFetch(`/api/sales/transaction/${receipt.transactionId}`);
                setDetailItems(data.sales);
                setIsDetailOpen(true);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Memuat Detail', description: 'Tidak dapat menemukan detail penjualan untuk resi ini.'});
            }
        } else {
             // Otherwise, open the dialog to record the sale.
            setReceiptForSale(receipt);
            setIsSaleDialogOpen(true);
        }
    };
    
    const handleSaleComplete = async (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => {
        try {
            await inventoryContext.recordSaleWithReceipt(receiptData, salesData);
            toast({
                title: "Penjualan Berhasil Dicatat",
                description: `Penjualan untuk resi ${receiptData.awb} telah disimpan.`,
            });
            setIsSaleDialogOpen(false);
            setReceiptForSale(null);
            await loadReceipts();
        } catch (error: any) {
            toast({
                title: "Gagal Mencatat Penjualan",
                description: error.message || "Terjadi kesalahan saat menyimpan data penjualan.",
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        language, t, router, receipts, totalReceipts, loading, awb, setAwb, isSubmitting,
        awbInputRef, currentPage, setCurrentPage, itemsPerPage, searchTerm, setSearchTerm,
        selectedDate, setSelectedDate, detailItems, isDetailOpen, setIsDetailOpen, receiptForSale,
        setReceiptForSale, isSaleDialogOpen, setIsSaleDialogOpen, salesChannel, shippingChannel,
        handleAwbSubmit, handleViewDetails, handleSaleComplete, totalPages: Math.ceil(totalReceipts / itemsPerPage)
    };
}


export default function ShopeeChannelPage() {
  const {
      t, router, receipts, totalReceipts, loading, awb, setAwb, isSubmitting, awbInputRef,
      currentPage, setCurrentPage, itemsPerPage, searchTerm, setSearchTerm, selectedDate,
      setSelectedDate, detailItems, isDetailOpen, setIsDetailOpen, receiptForSale, setReceiptForSale,
      isSaleDialogOpen, setIsSaleDialogOpen, salesChannel, shippingChannel,
      handleAwbSubmit, handleViewDetails, handleSaleComplete, totalPages
  } = useReceiptPageLogic('Shopee');

  return (
    <AppLayout>
      <main className="flex min-h-svh flex-1 flex-col gap-4 bg-muted/40 p-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <SidebarTrigger className="hidden md:flex" />
            <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                {salesChannel} - {shippingChannel}
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
              <div className="flex items-center gap-2">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Resi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                    />
                </div>
                <DatePickerClient selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </div>
          </div>
          <div className="flex-grow overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[200px]">Tanggal</TableHead>
                  <TableHead>No. Resi (AWB)</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableSkeleton /> : receipts.length > 0 ? (
                  receipts.map((receipt) => {
                    const isProcessed = receipt.status !== 'Perlu Diproses';
                    
                    return (
                        <TableRow key={receipt.id} className={cn(!isProcessed && 'bg-yellow-50/50 hover:bg-yellow-50')}>
                          <TableCell>{format(new Date(receipt.date), 'dd MMM yyyy, HH:mm')}</TableCell>
                          <TableCell className="font-medium">{receipt.awb}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleViewDetails(receipt)}>
                               {isProcessed ? "Lihat Produk" : "Catat Produk"}
                                <Eye className="ml-2 h-3 w-3" />
                            </Button>
                          </TableCell>
                           <TableCell>
                                <Badge variant={isProcessed ? "default" : "outline"}>
                                    {receipt.status}
                                </Badge>
                           </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                    <EmptyState searchTerm={searchTerm} />
                )}
              </TableBody>
            </Table>
          </div>
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
          }
        }}
        onSaleComplete={handleSaleComplete}
        receipt={receiptForSale}
      />
    </AppLayout>
  );
}

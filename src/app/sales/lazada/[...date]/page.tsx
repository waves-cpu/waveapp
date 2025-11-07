
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
import { Calendar as CalendarIcon, ScanLine, Trash2, ShoppingCart, Search } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale, InventoryItem, InventoryItemVariant } from '@/types';
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
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/app/components/app-layout';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { useParams, useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


function parseDateFromParams(dateArray: string[] | undefined): Date {
    if (dateArray && dateArray.length > 0) {
      // Assuming the format is MM-dd-yyyy
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
}

export default function LazadaSalesPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { recordSale, cancelSale, getProductBySku, items, fetchSales: fetchSalesFromHook } = useInventory();
  const { toast } = useToast();
  const { playSuccessSound, playErrorSound } = useScanSounds();
  const router = useRouter();
  const params = useParams();

  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');


  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

  // The single source of truth for the date is the URL param.
  const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);

  const refocusInput = useCallback(() => {
    setTimeout(() => skuInputRef.current?.focus(), 0);
  }, []);

  const loadSales = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      // Fetch all sales for the day for client-side searching
      const { sales: salesData, total } = await fetchSalesFromHook('lazada', selectedDate, 1, 10000);
      setSales(salesData);
      setTotalSales(salesData.length); // Total is now based on fetched data for filtering
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
  }, [fetchSalesFromHook, toast]);
  
  // This effect reacts to changes in the URL parameter.
  useEffect(() => {
    loadSales(currentDate);
  }, [currentDate, loadSales]);
  
  useEffect(() => {
    refocusInput();
  }, [refocusInput]);

  const filteredSales = useMemo(() => {
    if (!searchTerm) {
      return sales;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return sales.filter(sale => 
      sale.productName.toLowerCase().includes(lowercasedFilter) ||
      (sale.sku && sale.sku.toLowerCase().includes(lowercasedFilter))
    );
  }, [sales, searchTerm]);

  useEffect(() => {
    setTotalSales(filteredSales.length);
    setCurrentPage(1);
  }, [filteredSales]);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // This function's only job is to change the URL.
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
        setDatePickerOpen(false);
        const formattedDate = format(newDate, 'MM-dd-yyyy');
        router.push(`/sales/lazada/${formattedDate}`);
        setCurrentPage(1);
    }
  }

  const handleRecordSale = useCallback(async (saleSku: string) => {
    if (!currentDate) return;
    setIsSubmitting(true);
    try {
        const { sale, updatedItem } = await recordSale(saleSku, 'lazada', 1, { saleDate: currentDate });
        playSuccessSound();
        toast({
            title: 'Penjualan Berhasil',
            description: `1 item dengan SKU ${saleSku} berhasil terjual.`,
        });
        setSales(prevSales => [sale, ...prevSales]); // Optimistic update
        setSku(''); 
    } catch (error) {
        playErrorSound();
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mencatat penjualan.';
        toast({
            variant: 'destructive',
            title: 'Penjualan Gagal',
            description: message,
        });
    } finally {
        setIsSubmitting(false);
        refocusInput();
    }
  }, [currentDate, recordSale, toast, playSuccessSound, playErrorSound, refocusInput]);

  const handleSkuSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sku || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const product = await getProductBySku(sku);

      if (!product) {
        playErrorSound();
        toast({
            variant: 'destructive',
            title: 'SKU Tidak Ditemukan',
            description: `Produk dengan SKU "${sku}" tidak ditemukan.`,
        });
        return;
      }
      
      if (product.variants && product.variants.length > 1) {
        setProductForVariantSelection(product);
        setIsVariantDialogOpen(true);
      } else {
         const itemToSell = (product.variants && product.variants.length === 1) ? product.variants[0] : product;
         if (itemToSell.stock !== undefined && itemToSell.stock <= 0) {
            playErrorSound();
            toast({
                variant: 'destructive',
                title: 'Stok Habis',
                description: `Stok untuk produk dengan SKU "${itemToSell.sku || sku}" sudah habis.`,
            });
            return;
        }
        await handleRecordSale(itemToSell.sku || sku);
      }
    } catch (error) {
      playErrorSound();
      console.error('Failed to process SKU:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Terjadi kesalahan saat memproses SKU.',
      });
    } finally {
      setIsSubmitting(false);
      setSku('');
      refocusInput();
    }
  };

  const handleVariantSelect = (variant: InventoryItemVariant | null) => {
    setIsVariantDialogOpen(false);
    setProductForVariantSelection(null);
    if (variant && variant.sku) {
        if(variant.stock <= 0) {
            playErrorSound();
            toast({
                variant: 'destructive',
                title: 'Stok Habis',
                description: `Stok untuk varian "${variant.name}" sudah habis.`,
            });
            refocusInput();
            return;
        }
        handleRecordSale(variant.sku);
    } else {
        refocusInput();
    }
  };
  
  const handleCancelSale = async (saleId: string) => {
    if (!currentDate) return;
    try {
        await cancelSale(saleId);
        toast({
            title: 'Penjualan Dibatalkan',
            description: 'Penjualan telah berhasil dibatalkan dan stok dikembalikan.',
        });
        // Optimistically remove from local state
        setSales(prevSales => prevSales.filter(s => s.id !== saleId));
    } catch (error) {
        console.error('Failed to cancel sale:', error);
        toast({
            variant: 'destructive',
            title: 'Gagal Membatalkan',
            description: 'Terjadi kesalahan saat membatalkan penjualan.',
        });
    }
  };
  
  const totalPages = Math.ceil(totalSales / itemsPerPage);


  return (
    <AppLayout>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
            {t.sales.lazada}
          </h1>
        </div>

        <div className="bg-card rounded-lg border shadow-sm flex flex-col h-full">
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
              <form onSubmit={handleSkuSubmit} className="flex-grow md:max-w-sm">
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          ref={skuInputRef}
                          placeholder="Scan atau masukkan SKU, lalu tekan Enter"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          className="pl-10 w-full"
                          disabled={isSubmitting || isVariantDialogOpen}
                      />
                  </div>
              </form>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari transaksi..."
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
                  <TableHead>{t.stockHistory.date}</TableHead>
                  <TableHead className="w-[40%]">{t.inventoryTable.name}</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>{t.inventoryTable.size}</TableHead>
                  <TableHead>{t.inventoryTable.price}</TableHead>
                  <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                          <TableCell className="text-center">
                              <Skeleton className="h-8 w-8 rounded-md" />
                          </TableCell>
                      </TableRow>
                  ))
                ) : paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.saleDate), 'PP')}</TableCell>
                      <TableCell>{sale.productName}</TableCell>
                      <TableCell>{sale.sku}</TableCell>
                      <TableCell>{sale.variantName || '-'}</TableCell>
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
            {totalPages > 1 && (
                <div className="flex items-center justify-end p-4 border-t">
                    <div className="flex items-center gap-4">
                        <Pagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                        <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value))
                                setCurrentPage(1)
                            }}
                            >
                            <SelectTrigger className="h-8 w-[200px]">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {`${pageSize} / ${t.productSelectionDialog.page}`}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      {productForVariantSelection && (
          <VariantSelectionDialog
              open={isVariantDialogOpen}
              onOpenChange={(isOpen) => {
                  setIsVariantDialogOpen(isOpen);
                  if (!isOpen) {
                    refocusInput();
                  }
              }}
              item={productForVariantSelection}
              onSelect={handleVariantSelect}
              cart={[]}
          />
      )}
    </AppLayout>
  );
}

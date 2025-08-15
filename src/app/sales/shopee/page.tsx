
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Calendar as CalendarIcon, ScanLine, Trash2, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale, InventoryItem } from '@/types';
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

export default function ShopeeSalesPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { fetchSales, recordSale, cancelSale, getProductBySku } = useInventory();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);


  const loadSales = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    try {
      const salesData = await fetchSales('shopee', selectedDate);
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
  
  useEffect(() => {
    // Focus the SKU input on page load
    skuInputRef.current?.focus();
  }, []);

  const handleRecordSale = useCallback(async (saleSku: string) => {
    if (!date) return;
    setIsSubmitting(true);
    try {
        await recordSale(saleSku, 'shopee', 1);
        toast({
            title: 'Penjualan Berhasil',
            description: `1 item dengan SKU ${saleSku} berhasil terjual.`,
        });
        setSku(''); // Clear main input
        loadSales(date);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mencatat penjualan.';
        toast({
            variant: 'destructive',
            title: 'Penjualan Gagal',
            description: message,
        });
    } finally {
        setIsSubmitting(false);
        skuInputRef.current?.focus();
    }
  }, [date, recordSale, toast, loadSales]);

  const handleSkuSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sku || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const product = await getProductBySku(sku);

      if (!product) {
        toast({
            variant: 'destructive',
            title: 'SKU Tidak Ditemukan',
            description: `Produk dengan SKU "${sku}" tidak ditemukan.`,
        });
        return;
      }
      
      if (product.variants && product.variants.length > 0) {
        // Parent SKU entered, open variant selection dialog
        setProductForVariantSelection(product);
        setIsVariantDialogOpen(true);
      } else {
        // Simple product SKU entered, record sale directly
        if (product.stock !== undefined && product.stock <= 0) {
            toast({
                variant: 'destructive',
                title: 'Stok Habis',
                description: `Stok untuk produk dengan SKU "${sku}" sudah habis.`,
            });
            return;
        }
        await handleRecordSale(sku);
      }
    } catch (error) {
      console.error('Failed to process SKU:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Terjadi kesalahan saat memproses SKU.',
      });
    } finally {
      setIsSubmitting(false);
      setSku('');
    }
  };

  const handleVariantSelect = (variantSku: string | null) => {
    setIsVariantDialogOpen(false);
    setProductForVariantSelection(null);
    if (variantSku) {
        handleRecordSale(variantSku);
    } else {
        skuInputRef.current?.focus();
    }
  };
  
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
    <>
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
          {t.sales.shopee}
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-full md:w-[240px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>{t.stockHistory.dateRange}</span>}
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
        </div>
        <div className="flex-grow overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>{t.stockHistory.date}</TableHead>
                <TableHead className="w-[40%]">{t.inventoryTable.name}</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{t.inventoryTable.size}</TableHead>
                <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Memuat data penjualan...
                  </TableCell>
                </TableRow>
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.saleDate), 'PPpp')}</TableCell>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell>{sale.sku}</TableCell>
                    <TableCell>{sale.variantName || '-'}</TableCell>
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
    {productForVariantSelection && (
        <VariantSelectionDialog
            open={isVariantDialogOpen}
            onOpenChange={setIsVariantDialogOpen}
            item={productForVariantSelection}
            onSelect={handleVariantSelect}
        />
    )}
    </>
  );
}


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
import { Calendar as CalendarIcon, ScanLine, Trash2, ShoppingCart, XCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
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
import { PosOrderSummary, type PosCartItem } from '@/app/components/pos-order-summary';


export default function PosSalesPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { fetchSales, recordSale, cancelSale, getProductBySku, items } = useInventory();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  
  const [cart, setCart] = useState<PosCartItem[]>([]);

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
  
  useEffect(() => {
    // Focus the SKU input on page load
    skuInputRef.current?.focus();
  }, []);

  const findItemBySku = (skuToFind: string): InventoryItemVariant | (InventoryItem & { isVariant: false }) | null => {
     for (const item of items) {
        if (item.variants && item.variants.length > 0) {
            const foundVariant = item.variants.find(v => v.sku === skuToFind);
            if (foundVariant) return { ...foundVariant, parentName: item.name };
        } else {
            if (item.sku === skuToFind) return { ...item, isVariant: false };
        }
    }
    return null;
  }

  const handleAddToCart = useCallback((saleSku: string) => {
    const existingCartItemIndex = cart.findIndex(item => item.sku === saleSku);
    const itemDetails = findItemBySku(saleSku);

    if (!itemDetails) {
         toast({
            variant: 'destructive',
            title: 'Produk tidak ditemukan',
            description: `SKU ${saleSku} tidak cocok dengan produk manapun.`,
        });
        return;
    }
    
    if (itemDetails.stock <= 0 || (existingCartItemIndex !== -1 && cart[existingCartItemIndex].quantity >= itemDetails.stock)) {
        toast({
            variant: 'destructive',
            title: 'Stok Tidak Cukup',
            description: `Stok untuk ${itemDetails.name} sudah habis.`,
        });
        return;
    }

    if (existingCartItemIndex !== -1) {
        // Item already in cart, increment quantity
        const newCart = [...cart];
        newCart[existingCartItemIndex].quantity += 1;
        setCart(newCart);
    } else {
        // Add new item to cart
        const newCartItem: PosCartItem = {
            id: itemDetails.id.toString(),
            name: 'isVariant' in itemDetails ? itemDetails.parentName! : itemDetails.name,
            variantName: 'isVariant' in itemDetails ? itemDetails.name : undefined,
            sku: saleSku,
            price: itemDetails.price!,
            quantity: 1,
            maxStock: itemDetails.stock,
        };
        setCart(prevCart => [...prevCart, newCartItem]);
    }
     toast({
        title: 'Item Ditambahkan',
        description: `${itemDetails.name} ditambahkan ke keranjang.`,
    });
  }, [cart, items, toast]);


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
        if (product.variants.length === 1 && product.variants[0].sku === sku) {
             // It was a variant SKU that was entered directly
            handleAddToCart(sku);
        } else {
            // Parent SKU entered, open variant selection dialog
            setProductForVariantSelection(product);
            setIsVariantDialogOpen(true);
        }
      } else {
        // Simple product SKU entered, add to cart
        handleAddToCart(sku);
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
        handleAddToCart(variantSku);
    } 
    skuInputRef.current?.focus();
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

  const handleCheckout = async () => {
    if (!date) return;
    setIsSubmitting(true);
    try {
        for (const item of cart) {
            await recordSale(item.sku, 'pos', item.quantity);
        }
        toast({
            title: 'Transaksi Berhasil',
            description: `${cart.length} jenis item berhasil terjual.`
        });
        setCart([]);
        loadSales(date);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
        toast({
            variant: 'destructive',
            title: 'Transaksi Gagal',
            description: message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <>
    <main className="flex min-h-screen flex-1 bg-muted/40 md:p-10 p-4">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="lg:col-span-2 flex flex-col gap-8">
                 <div className="flex items-center gap-4">
                    <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                    {t.sales.pos}
                    </h1>
                </div>
                <div className="bg-card rounded-lg border shadow-sm flex flex-col h-full">
                    <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
                        <form onSubmit={handleSkuSubmit} className="flex-grow md:max-w-sm">
                            <div className="relative">
                                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={skuInputRef}
                                    placeholder="Scan atau masukkan SKU..."
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
                            {date ? format(date, 'PP') : <span>{t.stockHistory.dateRange}</span>}
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
                            <TableHead className="w-[40%]">{t.inventoryTable.name}</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>{t.inventoryTable.size}</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : sales.length > 0 ? (
                            sales.map((sale) => (
                            <TableRow key={sale.id}>
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
            </div>
            <div className="lg:col-span-1">
                <PosOrderSummary 
                    cart={cart}
                    setCart={setCart}
                    onCheckout={handleCheckout}
                    isSubmitting={isSubmitting}
                />
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

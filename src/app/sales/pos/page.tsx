
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ScanLine, History, ShoppingBag, Store } from 'lucide-react';
import { format } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PosOrderSummary, type PosCartItem } from '@/app/components/pos-order-summary';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 9;

const PosProductGrid = ({ 
    onProductSelect, 
    onSkuSubmit, 
    isSubmitting,
    isVariantDialogOpen
}: { 
    onProductSelect: (item: InventoryItem) => void,
    onSkuSubmit: (sku: string) => void;
    isSubmitting: boolean;
    isVariantDialogOpen: boolean;
}) => {
    const { items, loading, allSales } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const skuInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const soldCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        allSales.forEach(sale => {
            const currentCount = counts.get(sale.productId) || 0;
            counts.set(sale.productId, currentCount + sale.quantity);
        });
        return counts;
    }, [allSales]);

    const formatSoldCount = (count: number): string => {
        if (!count) return '';
        if (count >= 1000) {
            return `${Math.floor(count / 1000)}RB+ terjual`;
        }
        return `${count} terjual`;
    };

    const availableItems = React.useMemo(() => {
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        
        return items.filter(item => {
            const hasStock = item.variants 
                ? item.variants.some(v => v.stock > 0)
                : (item.stock ?? 0) > 0;

            if (!hasStock) return false;
            
            if (!debouncedSearchTerm) return true;

            const matchesName = item.name.toLowerCase().includes(lowerCaseSearch);
            const matchesSku = item.sku?.toLowerCase().includes(lowerCaseSearch);
            const matchesVariant = item.variants?.some(v => 
                v.name.toLowerCase().includes(lowerCaseSearch) || v.sku?.toLowerCase().includes(lowerCaseSearch)
            );

            return matchesName || matchesSku || matchesVariant;
        });
    }, [items, debouncedSearchTerm]);

    const totalPages = Math.ceil(availableItems.length / ITEMS_PER_PAGE);

    const paginatedItems = React.useMemo(() => {
         const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
         return availableItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [availableItems, currentPage]);

    const handleSkuFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm) {
            onSkuSubmit(searchTerm);
            setSearchTerm('');
        }
    };
    
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);


    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                ))}
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
             <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <form onSubmit={handleSkuFormSubmit} className="flex-grow">
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          ref={skuInputRef}
                          placeholder="Scan atau masukkan SKU / Nama Produk, lalu tekan Enter"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full"
                          disabled={isSubmitting || isVariantDialogOpen}
                      />
                  </div>
              </form>
            </div>
            <ScrollArea className="flex-grow -mx-2">
                <div className="px-2">
                {paginatedItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pr-4">
                        {paginatedItems.map(item => {
                            const hasVariants = item.variants && item.variants.length > 0;
                            let priceDisplay;
                            let stockDisplay;

                            if (hasVariants) {
                                const prices = item.variants!.map(v => v.price).filter(p => p !== undefined);
                                const minPrice = Math.min(...prices);
                                const maxPrice = Math.max(...prices);
                                priceDisplay = prices.length > 0 
                                    ? (minPrice === maxPrice ? `Rp${minPrice.toLocaleString('id-ID')}` : `Rp${minPrice.toLocaleString('id-ID')} - Rp${maxPrice.toLocaleString('id-ID')}`)
                                    : '-';
                                stockDisplay = `Stok: ${item.variants!.reduce((acc, v) => acc + v.stock, 0)}`;
                            } else {
                                priceDisplay = `Rp${(item.price ?? 0).toLocaleString('id-ID')}`;
                                stockDisplay = `Stok: ${item.stock}`;
                            }
                            
                            const totalSold = soldCounts.get(item.id) || 0;

                            return (
                                <button key={item.id} onClick={() => onProductSelect(item)} className="border bg-card rounded-lg p-2 text-left hover:bg-accent transition-colors flex flex-col">
                                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden">
                                        <Image src={item.imageUrl || 'https://placehold.co/150x150.png'} alt={item.name} width={150} height={150} className="rounded-md object-cover h-full w-full" data-ai-hint="product image"/>
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm leading-tight line-clamp-2" title={item.name}>{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{stockDisplay}</p>
                                    </div>
                                    <div className="mt-1">
                                        <p className="font-bold text-primary text-sm">{priceDisplay}</p>
                                        <p className="text-xs text-muted-foreground">{formatSoldCount(totalSold)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                     <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 h-full">
                        <ShoppingBag className="h-16 w-16 mb-4" />
                        <p className="font-semibold">Produk Tidak Ditemukan</p>
                        <p className="text-sm text-center">Coba kata kunci lain atau periksa stok produk.</p>
                    </div>
                )}
                </div>
            </ScrollArea>
             {totalPages > 1 && (
                <div className="mt-4 shrink-0">
                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};


export default function PosSalesPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { recordSale, getProductBySku, items } = useInventory();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  
  const [cart, setCart] = useState<PosCartItem[]>([]);

  useEffect(() => {
    // Focus the SKU input on page load
    skuInputRef.current?.focus();
  }, []);

  const findItemBySku = (skuToFind: string): (InventoryItemVariant & { parentName: string, parentImageUrl?: string }) | (InventoryItem & { isVariant: false }) | null => {
     for (const item of items) {
        if (item.variants && item.variants.length > 0) {
            const foundVariant = item.variants.find(v => v.sku === skuToFind);
            if (foundVariant) return { ...foundVariant, parentName: item.name, parentImageUrl: item.imageUrl };
        } else {
            if (item.sku === skuToFind) return { ...item, isVariant: false };
        }
    }
    return null;
  }

  const handleAddToCart = useCallback((saleSku: string) => {
    if (!saleSku) {
        toast({
            variant: 'destructive',
            title: 'SKU Tidak Valid',
            description: `Produk yang dipilih tidak memiliki SKU.`,
        });
        return;
    }
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
            description: `Stok untuk ${'parentName' in itemDetails ? itemDetails.name : itemDetails.name} sudah habis.`,
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
            name: 'parentName' in itemDetails ? itemDetails.parentName! : itemDetails.name,
            variantName: 'parentName' in itemDetails ? itemDetails.name : undefined,
            sku: saleSku,
            price: itemDetails.price!,
            quantity: 1,
            maxStock: itemDetails.stock,
        };
        setCart(prevCart => [...prevCart, newCartItem]);
    }
     toast({
        title: 'Item Ditambahkan',
        description: `${'parentName' in itemDetails ? itemDetails.parentName : itemDetails.name}${ 'parentName' in itemDetails ? ` (${itemDetails.name})` : ''} ditambahkan ke keranjang.`,
    });
  }, [cart, items, toast]);
  
  const handleProductSelect = useCallback((item: InventoryItem) => {
    if (item.variants && item.variants.length > 0) {
        const availableVariants = item.variants.filter(v => v.stock > 0);
        if(availableVariants.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Stok Habis',
                description: `Semua varian untuk produk "${item.name}" sudah habis.`
            });
            return;
        }
        if (availableVariants.length === 1) {
            handleAddToCart(availableVariants[0].sku!);
        } else {
            setProductForVariantSelection({
                ...item,
                variants: availableVariants
            });
            setIsVariantDialogOpen(true);
        }
    } else if (item.sku) {
        handleAddToCart(item.sku);
    } else {
        toast({
            variant: 'destructive',
            title: 'SKU Tidak Ditemukan',
            description: `Produk "${item.name}" tidak memiliki SKU untuk ditambahkan.`
        });
    }
  }, [handleAddToCart, toast]);


  const handleSkuSubmit = async (skuValue: string) => {
    if (!skuValue || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const product = await getProductBySku(skuValue);

      if (!product) {
        toast({
            variant: 'destructive',
            title: 'SKU Tidak Ditemukan',
            description: `Produk dengan SKU atau Nama "${skuValue}" tidak ditemukan.`,
        });
        return;
      }
      
       handleProductSelect(product);
    } catch (error) {
      console.error('Failed to process SKU:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Terjadi kesalahan saat memproses SKU.',
      });
    } finally {
      setIsSubmitting(false);
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
  
  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
        const saleDate = new Date();
        for (const item of cart) {
            await recordSale(item.sku, 'pos', item.quantity, saleDate);
        }
        toast({
            title: 'Transaksi Berhasil',
            description: `${cart.length} jenis item berhasil terjual.`
        });
        setCart([]);
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
      <main className="flex flex-col h-screen bg-muted/40">
        <header className="flex items-center justify-between p-4 border-b bg-background shrink-0">
          <h1 className="text-xl font-bold font-headline text-primary">POS</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/sales/pos/history">
                  <History className="h-4 w-4" />
                  <span className="sr-only">Riwayat Penjualan POS</span>
              </Link>
            </Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 overflow-hidden">
              <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
                  <PosProductGrid 
                    onProductSelect={handleProductSelect}
                    onSkuSubmit={handleSkuSubmit}
                    isSubmitting={isSubmitting}
                    isVariantDialogOpen={isVariantDialogOpen}
                  />
              </div>
              <div className="lg:col-span-2 h-full overflow-hidden">
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

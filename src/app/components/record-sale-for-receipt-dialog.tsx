
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ShoppingBag, Search } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant, ShippingReceipt } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { PosSearch } from './pos-search';
import { useDebounce } from '@/hooks/use-debounce';

interface CartItem {
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    sku: string;
    quantity: number;
    price: number;
    imageUrl?: string;
}


interface RecordSaleForReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ShippingReceipt | null;
}

export function RecordSaleForReceiptDialog({
  open,
  onOpenChange,
  receipt,
}: RecordSaleForReceiptDialogProps) {
  const { items: inventoryItems, recordSale } = useInventory();
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { playSuccessSound, playErrorSound } = useScanSounds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const searchSuggestions = useMemo(() => {
    if (debouncedSearchTerm.length < 2) return [];
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return inventoryItems.filter(item => 
        item.name.toLowerCase().includes(lowercasedTerm) ||
        (item.sku && item.sku.toLowerCase().includes(lowercasedTerm)) ||
        (item.variants && item.variants.some(v => v.sku?.toLowerCase().includes(lowercasedTerm)))
    ).slice(0, 10);
}, [debouncedSearchTerm, inventoryItems]);


  useEffect(() => {
    if (!open) {
      setCart([]);
      setIsSubmitting(false);
      setSearchTerm('');
    }
  }, [open]);

  const addToCart = useCallback((item: InventoryItem, variant?: InventoryItemVariant) => {
    const onlinePrice = item.channelPrices?.find(p => ['shopee', 'tiktok', 'lazada'].includes(p.channel))?.price;

    const itemToAdd = {
        productId: item.id,
        productName: item.name,
        variantId: variant?.id,
        variantName: variant?.name,
        sku: variant?.sku || item.sku || '',
        quantity: 1,
        price: onlinePrice ?? variant?.price ?? item.price ?? 0,
        imageUrl: item.imageUrl
    };

    if (!itemToAdd.sku) {
        toast({ variant: 'destructive', title: 'SKU Tidak Ditemukan', description: 'Produk ini tidak memiliki SKU dan tidak dapat ditambahkan.' });
        playErrorSound();
        return;
    }

    setCart(currentCart => {
      const existingItem = currentCart.find(ci => ci.sku === itemToAdd.sku);
      if (existingItem) {
        return currentCart.map(ci =>
          ci.sku === itemToAdd.sku ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      playSuccessSound();
      return [...currentCart, itemToAdd];
    });
    setSearchTerm('');
  }, [toast, playErrorSound, playSuccessSound]);

  const handleProductSelect = useCallback((product: InventoryItem) => {
    if (product.variants && product.variants.length > 1) {
        setProductForVariantSelection(product);
    } else if (product.variants && product.variants.length === 1) {
        addToCart(product, product.variants[0]);
    } else {
        addToCart(product);
    }
    setSearchTerm('');
  }, [addToCart]);

  const handleVariantSelect = (variant: InventoryItemVariant | null) => {
    if (variant && productForVariantSelection) {
        addToCart(productForVariantSelection, variant);
    }
    setProductForVariantSelection(null);
  };


  const updateQuantity = (sku: string, newQuantity: number) => {
    setCart(currentCart =>
      currentCart.map(item =>
        item.sku === sku ? { ...item, quantity: Math.max(0, newQuantity) } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (sku: string) => {
    setCart(currentCart => currentCart.filter(item => item.sku !== sku));
  };

  const handleFinalizeSale = async () => {
    if (!receipt || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const salePromises = cart.map(item =>
        recordSale(item.sku, receipt.salesChannel || 'Unknown', item.quantity, {
            transactionId: receipt.transactionId || receipt.awb,
            priceAtSale: item.price,
            status: 'Dikirim'
        })
      );
      await Promise.all(salePromises);
      toast({
        title: 'Penjualan Dicatat',
        description: `Stok untuk ${cart.length} produk telah berhasil dikurangi.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to record sale:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mencatat Penjualan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Penjualan untuk Resi</DialogTitle>
          <DialogDescription>
            Scan atau cari produk untuk resi: <span className="font-semibold">{receipt?.awb}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
             <PosSearch 
                onProductSelect={handleProductSelect} 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                suggestions={searchSuggestions}
            />
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%] whitespace-nowrap">Produk</TableHead>
                      <TableHead className="whitespace-nowrap">Ukuran</TableHead>
                      <TableHead className="whitespace-nowrap">Jumlah</TableHead>
                      <TableHead className="whitespace-nowrap">Harga Jual</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length > 0 ? (
                      cart.map(item => (
                        <TableRow key={item.sku}>
                          <TableCell>
                            <div className="font-medium whitespace-nowrap">{item.productName}</div>
                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                          </TableCell>
                          <TableCell>{item.variantName || '-'}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateQuantity(item.sku, parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-center"
                            />
                          </TableCell>
                           <TableCell>
                             {item.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                           </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.sku)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                           <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <ShoppingBag className="h-10 w-10" />
                                <p className="font-medium">Belum ada produk</p>
                                <p className="text-sm">Scan atau cari untuk menambahkan.</p>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleFinalizeSale} disabled={cart.length === 0 || isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Penjualan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     {productForVariantSelection && (
        <VariantSelectionDialog
            open={!!productForVariantSelection}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setProductForVariantSelection(null);
                }
            }}
            item={productForVariantSelection}
            onSelect={handleVariantSelect}
            cart={[]}
            ignoreStockCheck={true}
        />
    )}
    </>
  );
}

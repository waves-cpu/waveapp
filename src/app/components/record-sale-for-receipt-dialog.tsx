

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
import type { InventoryItem, InventoryItemVariant, ShippingReceipt, Sale, SearchableItem } from '@/types';
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
    maxStock: number;
}


interface RecordSaleForReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleComplete: (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => Promise<void>;
  receipt: Omit<ShippingReceipt, 'id'> | ShippingReceipt | null;
}

export function RecordSaleForReceiptDialog({
  open,
  onOpenChange,
  onSaleComplete,
  receipt,
}: RecordSaleForReceiptDialogProps) {
  const { items: inventoryItems, findProductBySku, getActiveDiscountPrice } = useInventory();
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { playSuccessSound, playErrorSound } = useScanSounds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchSuggestions = useMemo(() => {
    if (debouncedSearchTerm.length < 2) return [];
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return inventoryItems.filter(item => 
        !item.isArchived &&
        (item.name.toLowerCase().includes(lowercasedTerm) ||
        (item.sku && item.sku.toLowerCase().includes(lowercasedTerm)) ||
        (item.variants && item.variants.some(v => v.sku?.toLowerCase().includes(lowercasedTerm))))
    ).slice(0, 10) as SearchableItem[];
}, [debouncedSearchTerm, inventoryItems]);


  useEffect(() => {
    if (!open) {
      setCart([]);
      setIsSubmitting(false);
      setSearchTerm('');
    }
  }, [open]);

  const addToCart = useCallback(async (item: InventoryItem, variant?: InventoryItemVariant) => {
    const itemToAddRaw = variant || item;
    
    const quantityInCart = cart.find(ci => ci.sku === itemToAddRaw.sku)?.quantity || 0;
    const availableStock = (itemToAddRaw.stock ?? 0) - quantityInCart;

    if (availableStock <= 0) {
        toast({
            variant: "destructive",
            title: "Stok Habis",
            description: `Stok untuk ${item.name} ${itemToAddRaw.name ? `- ${itemToAddRaw.name}` : ''} sudah habis.`
        });
        playErrorSound();
        return;
    }
    
    const discountPrice = await getActiveDiscountPrice(item.id, itemToAddRaw.id, item.category, receipt!.salesChannel!);
    const price = discountPrice ?? itemToAddRaw.price ?? 0;

    const itemSku = variant?.sku || item.sku;

    if (!itemSku) {
        toast({ variant: 'destructive', title: 'SKU Tidak Ditemukan', description: 'Produk ini tidak memiliki SKU dan tidak dapat ditambahkan.' });
        playErrorSound();
        return;
    }

    const itemToAdd: CartItem = {
        productId: item.id,
        productName: item.name,
        variantId: variant?.id,
        variantName: variant?.name,
        sku: itemSku,
        quantity: 1,
        price: price,
        imageUrl: item.imageUrl,
        maxStock: itemToAddRaw.stock || 0
    };

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
  }, [cart, toast, playErrorSound, playSuccessSound, receipt, getActiveDiscountPrice]);
  
 const handleProductSelect = useCallback(async (productOrSku: SearchableItem | string) => {
    let product: InventoryItem | null = null;
    let skuToSearch: string;

    if (typeof productOrSku === 'string') {
        skuToSearch = productOrSku;
    } else {
        // If it's an object with SKU, that's our primary identifier
        skuToSearch = productOrSku.sku || productOrSku.name;
    }
    
    product = await findProductBySku(skuToSearch);
    
    if (!product) {
        // If search by SKU fails, maybe it was a name search from PosSearch suggestion
        if (typeof productOrSku !== 'string') {
           product = inventoryItems.find(i => i.id === productOrSku.id) || null;
        }
    }
    
    if (!product) {
        playErrorSound();
        toast({ variant: 'destructive', title: 'Produk Tidak Ditemukan', description: `Tidak ada produk yang cocok dengan '${skuToSearch}'` });
        return;
    }

    if (product.variants && product.variants.length > 1) {
        setProductForVariantSelection(product);
    } else if (product.variants && product.variants.length === 1) {
        addToCart(product, product.variants[0]);
    } else {
        addToCart(product);
    }
    setSearchTerm('');
}, [findProductBySku, addToCart, playErrorSound, toast, inventoryItems]);


  const handleVariantSelect = (variant: InventoryItemVariant | null) => {
    if (variant && productForVariantSelection) {
        addToCart(productForVariantSelection, variant);
    }
    setProductForVariantSelection(null);
  };


  const updateQuantity = (sku: string, newQuantity: number) => {
    setCart(currentCart => {
      const item = currentCart.find(ci => ci.sku === sku);
      if (!item) return currentCart;

      const maxStock = item.maxStock;
      const finalQuantity = Math.max(0, Math.min(newQuantity, maxStock));

      if (newQuantity > maxStock) {
        toast({
            variant: "destructive",
            title: "Stok Tidak Cukup",
            description: `Hanya tersedia ${maxStock} stok untuk produk ini.`,
        });
      }

      if (finalQuantity === 0) {
        return currentCart.filter(ci => ci.sku !== sku);
      }

      return currentCart.map(ci =>
        ci.sku === sku ? { ...ci, quantity: finalQuantity } : ci
      );
    });
  };

  const removeFromCart = (sku: string) => {
    setCart(currentCart => currentCart.filter(item => item.sku !== sku));
  };

  const handleFinalizeSale = useCallback(async () => {
    if (!receipt || cart.length === 0) return;
    setIsSubmitting(true);
    
    const salesData: Omit<Sale, 'id'>[] = cart.map(item => ({
        transactionId: receipt.transactionId,
        productId: item.productId,
        variantId: item.variantId,
        channel: receipt.salesChannel!,
        quantity: item.quantity,
        priceAtSale: item.price,
        saleDate: receipt.date,
        status: 'Dikirim',
        sku: item.sku,
    }));
    
    try {
      await onSaleComplete(receipt, salesData);
    } catch (error) {
      console.error('Failed to record sale:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [receipt, cart, onSaleComplete]);

  // Keyboard shortcut to finalize sale
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && open && cart.length > 0) {
        const activeElement = document.activeElement as HTMLElement;
        const isSearchInput = activeElement?.matches('input[type="text"]') && (activeElement as HTMLInputElement).value === '';
        const isNotInInput = activeElement && activeElement.tagName.toLowerCase() !== 'input' && activeElement.tagName.toLowerCase() !== 'button';

        if (isSearchInput || isNotInInput) {
            event.preventDefault();
            handleFinalizeSale();
        }
      }
    };

    const dialogElement = document.querySelector('[role="dialog"]');
    if (dialogElement) {
        dialogElement.addEventListener('keydown', handleKeyDown as any);
    }

    return () => {
        if (dialogElement) {
            dialogElement.removeEventListener('keydown', handleKeyDown as any);
        }
    };
  }, [open, cart, handleFinalizeSale]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Catat Penjualan untuk Resi</DialogTitle>
          <DialogDescription>
            Scan atau cari produk untuk resi: <span className="font-semibold">{receipt?.awb}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
             <PosSearch 
                ref={searchInputRef}
                onProductSelect={handleProductSelect}
                onSkuSubmit={handleProductSelect}
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

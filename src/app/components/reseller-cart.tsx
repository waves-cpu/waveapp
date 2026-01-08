

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant, Reseller, SearchableItem } from '@/types';
import { PosSearch } from './pos-search';
import { PosOrderSummary } from './pos-order-summary';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { type ReceiptData } from './pos-receipt';
import { useDebounce } from '@/hooks/use-debounce';
import { ResellerInvoice } from './reseller-invoice';

export interface CartItem extends InventoryItemVariant {
    productId: string;
    productName: string;
    quantity: number;
    parentImageUrl?: string;
    originalPrice: number;
    type: 'product';
    maxStock: number;
}

interface ResellerCartProps {
    reseller: Reseller;
}

export function ResellerCart({ reseller }: ResellerCartProps) {
    const LOCAL_STORAGE_KEY = `resellerCart_${reseller.id}`;
    const { recordSale, items: inventoryItems, findProductBySku } = useInventory();
    const { language } = useLanguage();
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const t = translations[language];
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<ReceiptData & {reseller: Reseller} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const searchSuggestions = useMemo((): SearchableItem[] => {
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
        setIsClient(true);
        try {
            const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            } else {
                setCart([]); 
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
            setCart([]);
        }
    }, [reseller.id, LOCAL_STORAGE_KEY]);

    useEffect(() => {
        if (isClient) {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isClient, LOCAL_STORAGE_KEY]);

    useEffect(() => {
        if (invoiceToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setInvoiceToPrint(null); 
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [invoiceToPrint]);

    const getPriceForChannel = (item: InventoryItem | InventoryItemVariant, channel: string): number => {
        if ('channelPrices' in item && item.channelPrices) {
            const channelPrice = item.channelPrices?.find(p => p.channel === channel)?.price;
            return channelPrice ?? item.price!;
        }
        return item.price ?? 0;
    };

    const addToCart = useCallback((item: InventoryItem, variant?: InventoryItemVariant) => {
        const itemToAddRaw = variant || item;
        const price = getPriceForChannel(itemToAddRaw, 'reseller');

        const itemToAdd = {
            ...(variant || item),
            id: variant?.id || item.id,
            price,
            productId: item.id,
            productName: item.name,
            parentImageUrl: item.imageUrl,
            originalPrice: itemToAddRaw.price || 0,
            maxStock: itemToAddRaw.stock || 0,
            type: 'product' as const
        };
        
        const existingCartItem = cart.find(ci => ci.id === itemToAdd.id);
        const quantityInCart = existingCartItem?.quantity || 0;
        
        if (itemToAdd.stock === undefined || quantityInCart >= itemToAdd.stock) {
             toast({
                variant: "destructive",
                title: "Stok tidak mencukupi",
                description: `Anda tidak dapat menambahkan ${itemToAdd.productName} ${variant?.name || ''} lagi.`,
            });
            playErrorSound();
            return;
        }
        playSuccessSound();

        setCart(currentCart => {
            if (existingCartItem) {
                return currentCart.map(cartItem =>
                    cartItem.id === itemToAdd.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...currentCart, { ...itemToAdd, quantity: 1 }];
        });
    }, [cart, playErrorSound, playSuccessSound, toast]);

    const handleProductSelect = useCallback(async (selected: SearchableItem) => {
        if (selected.itemType !== 'product') return;
        const product = selected as InventoryItem;
        
        try {
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                 if (product.variants[0].stock <= 0) {
                     toast({ variant: "destructive", title: "Stok Habis", description: `Stok untuk ${product.name} - ${product.variants[0].name} sudah habis.` });
                     playErrorSound();
                     return;
                 }
                addToCart(product, product.variants[0]);
            } else {
                 if (product.stock !== undefined && product.stock <= 0) {
                     toast({ variant: "destructive", title: "Stok Habis", description: `Stok untuk ${product.name} sudah habis.` });
                     playErrorSound();
                     return;
                 }
                addToCart(product);
            }
        } catch (error) {
            console.error("Error adding product to cart:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal menambahkan produk ke keranjang.",
            });
            playErrorSound();
        }
        setSearchTerm('');
    }, [addToCart, playErrorSound, toast]);

    const handleSkuSubmit = useCallback(async (sku: string) => {
        const productData = await findProductBySku(sku);

        if (!productData) {
            playErrorSound();
            toast({ variant: 'destructive', title: 'Produk Tidak Ditemukan', description: `Tidak ada produk yang cocok dengan SKU '${sku}'` });
            return;
        }

        handleProductSelect(productData as SearchableItem);
        setSearchTerm('');
    }, [findProductBySku, handleProductSelect, playErrorSound, toast]);


    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addToCart(productForVariantSelection, variant);
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        setCart(currentCart => {
            if (newQuantity <= 0) {
                return currentCart.filter(ci => ci.id !== itemId);
            }
            
            const item = currentCart.find(ci => ci.id === itemId);
            if (item && newQuantity > item.stock) {
                toast({
                    variant: "destructive",
                    title: "Stok tidak mencukupi",
                    description: `Hanya tersedia ${item.stock} stok.`,
                });
                return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: item.stock } : ci);
            }

            return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: newQuantity } : ci);
        });
    };
    
    const removeFromCart = (itemId: string) => {
        setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    const handleSaleComplete = async (paymentMethod: string, receiptData: ReceiptData, status: 'Completed' | 'Pending' = 'Completed') => {
        const transactionId = `trans-${Date.now()}`;
        const salesPayload = cart.map(item => ({
            sku: item.sku!,
            quantity: item.quantity,
            priceAtSale: item.price,
        }));

        try {
            await recordSale('reseller', {
                sales: salesPayload,
                transactionId: transactionId,
                paymentMethod,
                resellerName: reseller.name,
                status,
            });

            toast({
                title: "Invoice Dibuat",
                description: "Invoice telah berhasil dibuat dan stok telah dipotong."
            });
            setInvoiceToPrint({ ...receiptData, transactionId: transactionId, reseller });
        } catch (error) {
            console.error("Failed to complete sale:", error);
            toast({
                variant: "destructive",
                title: "Gagal Membuat Invoice",
                description: "Terjadi kesalahan saat memproses transaksi.",
            });
            throw error;
        }
    };

    return (
        <>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-full no-print">
                <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                    <PosSearch 
                        ref={searchInputRef}
                        onProductSelect={handleProductSelect}
                        onSkuSubmit={handleSkuSubmit}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        suggestions={searchSuggestions}
                    />
                    <Card className="flex-grow flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">{t.pos.orderSummary}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-hidden p-0">
                            <ScrollArea className="h-full max-h-[calc(100vh-20rem)]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50%] text-xs">{t.pos.item}</TableHead>
                                            <TableHead className="text-center text-xs">{t.pos.qty}</TableHead>
                                            <TableHead className="text-left text-xs">{t.pos.price}</TableHead>
                                            <TableHead className="text-left text-xs">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <ShoppingCart className="h-12 w-12" />
                                                        <p className="font-semibold text-sm">{t.pos.emptyCart}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : cart.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Image src={item.parentImageUrl || 'https://placehold.co/40x40.png'} alt={item.productName} width={32} height={32} className="rounded-md" data-ai-hint="product image" />
                                                        <div>
                                                            <p className="font-medium text-sm truncate max-w-[250px]">{item.productName}</p>
                                                            <p className="text-xs text-muted-foreground">{item.name}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-16 h-8 text-center text-sm focus-visible:ring-1" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-left text-sm">{item.price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                <TableCell className="text-left font-medium text-sm">{(item.price * item.quantity).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFromCart(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 h-full">
                    <PosOrderSummary
                        cart={cart as any}
                        onSaleComplete={handleSaleComplete}
                        clearCart={clearCart}
                        channel="reseller"
                        pendingTransactionId={null}
                        onVoucherApplied={() => {}}
                        activeVoucher={null}
                    />
                </div>
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
                        cart={cart}
                    />
                )}
            </div>
             <div className="print-only-a4">
                {invoiceToPrint && <ResellerInvoice invoice={invoiceToPrint} />}
            </div>
        </>
    );
}

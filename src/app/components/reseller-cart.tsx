'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant, Accessory, SearchableItem, Sale, Reseller, ResellerTier } from '@/types';
import { PosSearch } from './pos-search';
import { ResellerOrderSummary } from './reseller-order-summary';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ShoppingCart, Trash2, Tags, User } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { useDebounce } from '@/hooks/use-debounce';
import { ResellerInvoice, type InvoiceData } from './reseller-invoice';


export type CartItem = {
    id: string; // variantId or accessoryId or productId
    productId: string; // parent product ID
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    price: number;
    originalPrice: number;
    category: string;
    imageUrl?: string;
    type: 'product' | 'accessory';
    maxStock: number;
};

const getLocalStorageKey = (resellerId: number | string | undefined) => `resellerCart_${resellerId}`;

interface ResellerCartProps {
    reseller: Reseller | null;
    resellerTier: ResellerTier;
}

export function ResellerCart({ reseller, resellerTier }: ResellerCartProps) {
    const { recordSale, items: inventoryItems, accessories, loading: inventoryLoading, fetchItems, findProductBySku } = useInventory();
    const { language } = useLanguage();
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const t = translations[language];
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const searchSuggestions = useMemo((): SearchableItem[] => {
        if (debouncedSearchTerm.length < 2) return [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        
        return inventoryItems
            .filter(item => 
                !item.isArchived &&
                (item.name.toLowerCase().includes(lowercasedTerm) ||
                (item.sku && item.sku.toLowerCase().includes(lowercasedTerm)) ||
                ('variants' in item && item.variants?.some(v => v.sku?.toLowerCase().includes(lowercasedTerm))))
            ).slice(0, 10) as SearchableItem[];
    }, [debouncedSearchTerm, inventoryItems]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Effect to load cart from local storage when reseller changes
    useEffect(() => {
        if (isClient && reseller) {
            try {
                const storageKey = getLocalStorageKey(reseller.id);
                const savedCart = localStorage.getItem(storageKey);
                if (savedCart) {
                    setCart(JSON.parse(savedCart));
                } else {
                    setCart([]);
                }
            } catch (error) {
                console.error("Failed to load reseller cart from localStorage", error);
                setCart([]);
            }
        } else if (!reseller) {
            setCart([]); // Clear cart if no reseller is selected
        }
    }, [reseller, isClient]);

    // Effect to save cart to local storage when it changes
    useEffect(() => {
        if (isClient && reseller) {
            try {
                const storageKey = getLocalStorageKey(reseller.id);
                if (cart.length > 0) {
                    localStorage.setItem(storageKey, JSON.stringify(cart));
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch (error) {
                console.error("Failed to save reseller cart to localStorage", error);
            }
        }
    }, [cart, reseller, isClient]);


    useEffect(() => {
        if (invoiceToPrint) {
            const timer = setTimeout(() => {
                window.print();
                setInvoiceToPrint(null);
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [invoiceToPrint]);
    
    useEffect(() => {
        if (!productForVariantSelection) {
            searchInputRef.current?.focus();
        }
    }, [cart.length, productForVariantSelection]);


    const addToCart = useCallback(async (item: InventoryItem, variant?: InventoryItemVariant) => {
        const itemToAddRaw = variant || item;
        if ((itemToAddRaw.stock ?? 0) <= 0) {
            toast({ variant: 'destructive', title: 'Stok Habis', description: `Stok untuk ${item.name} ${itemToAddRaw.name ? `- ${itemToAddRaw.name}` : ''} sudah habis.` });
            playErrorSound();
            return;
        }

        const price = itemToAddRaw.price || 0;
        
        const itemToAdd: CartItem = {
            id: itemToAddRaw.id,
            productId: item.id,
            productName: item.name,
            variantName: variant?.name,
            sku: itemToAddRaw.sku!,
            quantity: 1,
            price: price, 
            originalPrice: price,
            category: item.category,
            imageUrl: item.imageUrl,
            type: 'product',
            maxStock: itemToAddRaw.stock!,
        }

        const existingCartItem = cart.find(ci => ci.id === itemToAdd.id && ci.type === itemToAdd.type);
        const quantityInCart = existingCartItem?.quantity || 0;
        
        if (itemToAdd.maxStock === undefined || quantityInCart >= itemToAdd.maxStock) {
             toast({ variant: "destructive", title: "Stok tidak mencukupi", description: `Anda tidak dapat menambahkan ${itemToAdd.productName} ${itemToAdd.variantName || ''} lagi.` });
            playErrorSound();
            return;
        }
        playSuccessSound();

        setCart(currentCart => {
            if (existingCartItem) {
                return currentCart.map(cartItem =>
                    cartItem.id === itemToAdd.id && cartItem.type === itemToAdd.type
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...currentCart, itemToAdd];
        });
    }, [cart, toast, playSuccessSound, playErrorSound]);

    const handleProductSelect = useCallback(async (item: SearchableItem) => {
        try {
            const product = item as InventoryItem;
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                addToCart(product, product.variants[0]);
            } else {
                addToCart(product);
            }
        } catch (error) {
            console.error("Error adding item to cart:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menambahkan item ke keranjang." });
            playErrorSound();
        }
    }, [addToCart, toast, playErrorSound]);
    
    const handleSkuSubmit = useCallback(async (sku: string) => {
        const productData = await findProductBySku(sku);

        if (!productData) {
            playErrorSound();
            toast({ variant: 'destructive', title: 'Produk Tidak Ditemukan', description: `Tidak ada produk yang cocok dengan SKU '${sku}'` });
            return;
        }

        if (productData.variants && productData.variants.length === 1) {
            addToCart(productData, productData.variants[0]);
        }
        else if (productData.variants && productData.variants.length > 1) {
            setProductForVariantSelection(productData);
        }
        else {
            addToCart(productData);
        }
    }, [findProductBySku, addToCart, playErrorSound, toast]);


    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addToCart(productForVariantSelection, variant);
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        setCart(currentCart => {
            const item = currentCart.find(ci => ci.id === itemId);
            if (!item) return currentCart;

            if (newQuantity <= 0) return currentCart.filter(ci => ci.id !== itemId);
            if (newQuantity > item.maxStock) return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: item.maxStock } : ci);
            return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: newQuantity } : ci);
        });
    };
    
    useEffect(() => {
        cart.forEach(item => {
            if (item.quantity > item.maxStock) {
                toast({ variant: "destructive", title: "Stok tidak mencukupi", description: `Hanya tersedia ${item.maxStock} stok untuk ${item.productName}.` });
            }
        });
    }, [cart, toast]);
    
    const removeFromCart = (itemId: string) => {
        setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        if (reseller) {
            localStorage.removeItem(getLocalStorageKey(reseller.id));
        }
        setCart([]);
    };

    const handleSaleComplete = async (paymentMethod: string, invoiceData: InvoiceData) => {
        if (!reseller) return;
        
        const salesData = cart.map(item => ({
            sku: item.sku,
            quantity: item.quantity,
            priceAtSale: item.price,
        }));
        
        try {
            await recordSale('reseller', {
                sales: salesData,
                transactionId: invoiceData.transactionId,
                paymentMethod: paymentMethod,
                resellerName: reseller.name
            });

            toast({ title: "Penjualan Berhasil", description: "Transaksi reseller telah berhasil dicatat." });
            setInvoiceToPrint(invoiceData);
            await fetchItems();
        } catch (error) {
            console.error("Failed to complete sale:", error);
            toast({ variant: "destructive", title: "Gagal Menyelesaikan Penjualan", description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses transaksi." });
            throw error;
        }
    };


    return (
        <>
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-full no-print">
            <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                <PosSearch 
                    onProductSelect={handleProductSelect} 
                    onSkuSubmit={handleSkuSubmit}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    suggestions={searchSuggestions}
                    ref={searchInputRef}
                    disabled={!reseller}
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
                                    {!reseller ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                 <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <User className="h-12 w-12" />
                                                    <p className="font-semibold text-sm">Pilih Reseller untuk Memulai</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : cart.length === 0 ? (
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
                                                    <Image src={item.imageUrl || 'https://placehold.co/40x40.png'} alt={item.productName} width={32} height={32} className="rounded-md" data-ai-hint="product image" />
                                                    <div>
                                                        <p className="font-medium text-sm truncate max-w-[250px]">{item.productName}</p>
                                                        <p className="text-xs text-muted-foreground">{item.variantName || 'Produk'}</p>
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
                 <ResellerOrderSummary
                    cart={cart}
                    onSaleComplete={handleSaleComplete}
                    clearCart={clearCart}
                    reseller={reseller}
                    resellerTier={resellerTier}
                />
            </div>
             {productForVariantSelection && (
                <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => { if (!isOpen) setProductForVariantSelection(null); }}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelect}
                    cart={cart}
                />
            )}
        </div>
         <div className="print-only-a4">
            {invoiceToPrint && <ResellerInvoice ref={null} invoice={invoiceToPrint} />}
        </div>
        </>
    );
}

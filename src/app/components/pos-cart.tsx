
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant } from '@/types';
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
import { PosReceipt, type ReceiptData } from './pos-receipt';

export interface CartItem extends InventoryItemVariant {
    productId: string;
    productName: string;
    quantity: number;
    parentImageUrl?: string;
}

const LOCAL_STORAGE_KEY = 'posCart';

export function PosCart() {
    const { getProductBySku, recordSale } = useInventory();
    const { language } = useLanguage();
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const t = translations[language];
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [receiptToPrint, setReceiptToPrint] = useState<ReceiptData | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setIsClient(true);
        try {
            const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
        }
    }, []);

    useEffect(() => {
        if (isClient) {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isClient]);

    // This useEffect handles the printing after the state has been updated
    useEffect(() => {
        if (receiptToPrint) {
            // Timeout ensures the component has time to render before printing
            const timer = setTimeout(() => {
                window.print();
                setReceiptToPrint(null); // Reset after printing
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [receiptToPrint]);

    const addToCart = (item: InventoryItem, variant?: InventoryItemVariant) => {
        const itemToAdd = variant ? 
            { ...variant, productId: item.id, productName: item.name, parentImageUrl: item.imageUrl } : 
            { ...item, id: item.id, productId: item.id, productName: item.name, price: item.price!, stock: item.stock!, parentImageUrl: item.imageUrl };

        const existingCartItem = cart.find(ci => ci.id === itemToAdd.id);
        const quantityInCart = existingCartItem?.quantity || 0;
        
        if (quantityInCart >= itemToAdd.stock) {
             toast({
                variant: "destructive",
                title: "Stok tidak mencukupi",
                description: `Anda tidak dapat menambahkan ${itemToAdd.name} lagi.`,
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
    };

    const handleProductSelect = useCallback(async (sku: string) => {
        try {
            const product = await getProductBySku(sku);
            if (!product) {
                 toast({
                    variant: "destructive",
                    title: "Produk tidak ditemukan",
                    description: `Tidak ada produk dengan SKU: ${sku}`,
                });
                playErrorSound();
                return;
            }
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                addToCart(product, product.variants[0]);
            } else {
                 const itemInCart = cart.find(ci => ci.id === product.id);
                 if (product.stock === undefined || (product.stock - (itemInCart?.quantity || 0)) <= 0) {
                     toast({
                        variant: "destructive",
                        title: "Stok tidak mencukupi",
                        description: `Stok untuk ${product.name} habis.`,
                    });
                    playErrorSound();
                    return;
                }
                addToCart(product);
            }
        } catch (error) {
            console.error("Error fetching product by SKU:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal mengambil data produk.",
            });
            playErrorSound();
        }
    }, [getProductBySku, toast, cart, playErrorSound, playSuccessSound]);


    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            const itemInCart = cart.find(ci => ci.id === variant.id);
            if(variant.stock - (itemInCart?.quantity || 0) <= 0) {
                toast({
                    variant: "destructive",
                    title: "Stok tidak mencukupi",
                    description: `Stok untuk ${productForVariantSelection.name} - ${variant.name} habis.`,
                });
                playErrorSound();
            } else {
                addToCart(productForVariantSelection, variant);
            }
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

    const handleSaleComplete = async (paymentMethod: string, receiptData: ReceiptData) => {
        try {
            const salePromises = cart.map(item =>
                recordSale(item.sku!, 'pos', item.quantity, {
                    saleDate: new Date(),
                    transactionId: receiptData.transactionId,
                    paymentMethod,
                })
            );
            await Promise.all(salePromises);
            toast({
                title: "Penjualan Berhasil",
                description: "Transaksi telah berhasil dicatat."
            });
            setReceiptToPrint(receiptData); // Set the receipt data to trigger printing
        } catch (error) {
            console.error("Failed to complete sale:", error);
            toast({
                variant: "destructive",
                title: "Gagal Menyelesaikan Penjualan",
                description: "Terjadi kesalahan saat memproses transaksi.",
            });
            throw error; // Re-throw to prevent form reset in summary component
        }
    };


    return (
        <>
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-full no-print">
            <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                <PosSearch onProductSelect={handleProductSelect} />
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
                                                        <p className="font-medium text-sm">{item.productName}</p>
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
                    cart={cart}
                    onSaleComplete={handleSaleComplete}
                    clearCart={clearCart}
                    channel="pos"
                />
            </div>
             {productForVariantSelection && (
                <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => !isOpen && setProductForVariantSelection(null)}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelect}
                    cart={cart}
                />
            )}
        </div>
         <div className="print-only">
            {receiptToPrint && <PosReceipt ref={receiptRef} receipt={receiptToPrint} />}
        </div>
        </>
    );
}


'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

export interface CartItem extends InventoryItemVariant {
    productId: string;
    productName: string;
    quantity: number;
    parentImageUrl?: string;
}

export function PosCart() {
    const { getProductBySku, recordSale, fetchItems } = useInventory();
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);

    // Refetch items on mount to ensure stock levels are up-to-date
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const addToCart = (item: InventoryItem, variant?: InventoryItemVariant) => {
        const itemToAdd = variant ? 
            { ...variant, productId: item.id, productName: item.name, parentImageUrl: item.imageUrl } : 
            { ...item, id: item.id, productId: item.id, productName: item.name, price: item.price!, stock: item.stock!, parentImageUrl: item.imageUrl };

        setCart(currentCart => {
            const existingItem = currentCart.find(cartItem => cartItem.id === itemToAdd.id);
            if (existingItem) {
                if (existingItem.quantity < itemToAdd.stock) {
                    return currentCart.map(cartItem =>
                        cartItem.id === itemToAdd.id
                            ? { ...cartItem, quantity: cartItem.quantity + 1 }
                            : cartItem
                    );
                } else {
                     toast({
                        variant: "destructive",
                        title: "Stok tidak mencukupi",
                        description: `Anda tidak dapat menambahkan ${itemToAdd.name} lagi.`,
                    });
                    return currentCart;
                }
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
                return;
            }
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                addToCart(product, product.variants[0]);
            } else {
                 if (product.stock === undefined || product.stock <= 0) {
                     toast({
                        variant: "destructive",
                        title: "Stok tidak mencukupi",
                        description: `Stok untuk ${product.name} habis.`,
                    });
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
        }
    }, [getProductBySku, toast]);


    const handleVariantSelect = (variantSku: string | null) => {
        if (variantSku && productForVariantSelection) {
            const variant = productForVariantSelection.variants?.find(v => v.sku === variantSku);
            if (variant) {
                if(variant.stock <= 0) {
                    toast({
                        variant: "destructive",
                        title: "Stok tidak mencukupi",
                        description: `Stok untuk ${productForVariantSelection.name} - ${variant.name} habis.`,
                    });
                } else {
                    addToCart(productForVariantSelection, variant);
                }
            }
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        setCart(currentCart => {
            const item = currentCart.find(ci => ci.id === itemId);
            if (item && newQuantity > item.stock) {
                toast({
                    variant: "destructive",
                    title: "Stok tidak mencukupi",
                    description: `Hanya tersedia ${item.stock} stok.`,
                });
                return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: item.stock } : ci);
            }
            if (newQuantity <= 0) {
                return currentCart.filter(ci => ci.id !== itemId);
            }
            return currentCart.map(ci => ci.id === itemId ? { ...ci, quantity: newQuantity } : ci);
        });
    };
    
    const removeFromCart = (itemId: string) => {
        setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const handleSaleComplete = async (paymentMethod: string) => {
        const transactionId = `trans-${Date.now()}`;
        try {
             const salePromises = cart.map(item =>
                recordSale(item.sku!, 'pos', item.quantity, new Date(), transactionId, paymentMethod)
            );
            await Promise.all(salePromises);
            clearCart();
            // No need to call fetchItems here as recordSale for 'pos' only updates local state
        } catch (error) {
            console.error("Failed to complete sale:", error);
            toast({
                variant: "destructive",
                title: "Gagal Menyelesaikan Penjualan",
                description: "Terjadi kesalahan saat memproses transaksi.",
            });
        }
    };


    return (
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-full">
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
                                        <TableHead className="text-xs">{t.pos.qty}</TableHead>
                                        <TableHead className="text-right text-xs">{t.pos.price}</TableHead>
                                        <TableHead className="text-right text-xs">Total</TableHead>
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
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                                                    <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-10 h-8 text-center text-sm" />
                                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">{item.price.toLocaleString('id-ID')}</TableCell>
                                            <TableCell className="text-right font-medium text-sm">{(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
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
                />
            </div>
             {productForVariantSelection && (
                <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => !isOpen && setProductForVariantSelection(null)}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelect}
                />
            )}
        </div>
    );
}

    
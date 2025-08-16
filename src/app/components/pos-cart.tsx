
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { PosSearch } from './pos-search';
import { PosOrderSummary } from './pos-order-summary';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { useToast } from '@/hooks/use-toast';

export interface CartItem extends InventoryItemVariant {
    productId: string;
    productName: string;
    quantity: number;
}

export function PosCart() {
    const { getProductBySku, recordSale, cancelSaleTransaction, fetchItems } = useInventory();
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);

    // Refetch items on mount to ensure stock levels are up-to-date
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const addToCart = (item: InventoryItem, variant?: InventoryItemVariant) => {
        const itemToAdd = variant ? { ...variant, productId: item.id, productName: item.name } : { ...item, id: item.id, productId: item.id, productName: item.name, price: item.price!, stock: item.stock! };

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
                addToCart(productForVariantSelection, variant);
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

    const handleSaleComplete = async () => {
        const transactionId = `trans-${Date.now()}`;
        try {
             const salePromises = cart.map(item =>
                recordSale(item.sku!, 'pos', item.quantity, new Date(), transactionId)
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
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
            <div className="lg:col-span-2 flex flex-col gap-4">
                <PosSearch onProductSelect={handleProductSelect} />
                <PosOrderSummary
                    cart={cart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
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

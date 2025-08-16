
'use client';

import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

export interface PosCartItem {
  id: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl?: string;
}

interface PosOrderSummaryProps {
  cart: PosCartItem[];
  setCart: React.Dispatch<React.SetStateAction<PosCartItem[]>>;
  onCheckout: () => void;
}

export function PosOrderSummary({ cart, setCart, onCheckout }: PosOrderSummaryProps) {
    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const updateQuantity = (sku: string, newQuantity: number) => {
        setCart(prevCart =>
        prevCart.map(item => {
            if (item.sku === sku) {
            const clampedQuantity = Math.max(0, Math.min(newQuantity, item.maxStock));
            return { ...item, quantity: clampedQuantity };
            }
            return item;
        }).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
        );
    };

    const removeItem = (sku: string) => {
        setCart(prevCart => prevCart.filter(item => item.sku !== sku));
    };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b shrink-0">
        <CardTitle>Pesanan Saat Ini ({totalItems})</CardTitle>
      </CardHeader>

      <ScrollArea className="flex-grow">
        <CardContent className="p-4">
            {cart.length > 0 ? (
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.sku} className="flex items-center gap-4">
                            <Image 
                                src={item.imageUrl || 'https://placehold.co/64x64.png'} 
                                alt={item.name} 
                                width={48} height={48} 
                                className="rounded-md object-cover" 
                                data-ai-hint="product image"
                            />
                            <div className="flex-grow">
                                <p className="font-medium leading-tight text-sm" title={item.name}>{item.name}</p>
                                {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                                <p className="font-semibold text-sm mt-1">{`Rp${item.price.toLocaleString('id-ID')}`}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.sku, item.quantity - 1)}>
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.sku, item.quantity + 1)} disabled={item.quantity >= item.maxStock}>
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive-foreground hover:bg-destructive shrink-0" onClick={() => removeItem(item.sku)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground h-full min-h-48 text-center">
                    <ShoppingCart className="h-16 w-16 mb-4" />
                    <p className="font-semibold">Keranjang Kosong</p>
                    <p className="text-sm">Scan atau pilih produk untuk ditambahkan.</p>
                </div>
            )}
        </CardContent>
      </ScrollArea>
      
        {cart.length > 0 && (
            <CardFooter className="flex-col gap-4 p-4 border-t shrink-0">
                <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">Rp{subtotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <Separator/>
                <div className="w-full flex justify-between items-center font-bold text-base">
                    <span>Total</span>
                    <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <Button className="w-full" onClick={onCheckout}>
                    Lanjut ke Pembayaran
                </Button>
            </CardFooter>
        )}
    </Card>
  );
}

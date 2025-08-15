
'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, Minus, Plus, ScanLine } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface PosCartItem {
  id: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface PosOrderSummaryProps {
  cart: PosCartItem[];
  setCart: React.Dispatch<React.SetStateAction<PosCartItem[]>>;
  onCheckout: () => void;
  isSubmitting: boolean;
  onSkuSubmit: (sku: string) => void;
}

export function PosOrderSummary({ cart, setCart, onCheckout, isSubmitting, onSkuSubmit }: PosOrderSummaryProps) {
  const [skuInput, setSkuInput] = useState('');
  const skuInputRef = useRef<HTMLInputElement>(null);

  const updateQuantity = (sku: string, newQuantity: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.sku === sku) {
          const clampedQuantity = Math.max(1, Math.min(newQuantity, item.maxStock));
          return { ...item, quantity: clampedQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
    );
  };

  const removeItem = (sku: string) => {
    setCart(prevCart => prevCart.filter(item => item.sku !== sku));
  };

  const handleSkuFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (skuInput) {
      onSkuSubmit(skuInput);
      setSkuInput('');
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card className="sticky top-0 flex flex-col h-full">
      <CardHeader>
        <CardTitle>Pesanan Saat Ini</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
          <div className="px-6 pb-4 border-b">
              <form onSubmit={handleSkuFormSubmit} className="flex-grow">
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          ref={skuInputRef}
                          placeholder="Scan atau masukkan SKU..."
                          value={skuInput}
                          onChange={(e) => setSkuInput(e.target.value)}
                          className="pl-10 w-full"
                          disabled={isSubmitting}
                      />
                  </div>
              </form>
          </div>
        {cart.length > 0 ? (
          <ScrollArea className="flex-grow p-6 pt-4">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.sku} className="flex items-start gap-4">
                  <div className="flex-grow">
                    <p className="font-medium leading-tight">{item.name}</p>
                    {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                     <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    <p className="font-semibold">{`Rp${item.price.toLocaleString('id-ID')}`}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateQuantity(item.sku, parseInt(e.target.value, 10) || 1)}
                      className="h-6 w-12 text-center px-1"
                       onFocus={(e) => e.target.select()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => removeItem(item.sku)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p className="font-semibold">Keranjang Kosong</p>
            <p className="text-sm">Scan atau pilih produk untuk ditambahkan.</p>
          </div>
        )}
      </CardContent>
      {cart.length > 0 && (
         <CardFooter className="flex-col !p-6 border-t">
            <div className="w-full space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                    <span>Subtotal ({totalItems} item)</span>
                    <span className="font-medium">{`Rp${totalPrice.toLocaleString('id-ID')}`}</span>
                </div>
            </div>
            <Button onClick={onCheckout} className="w-full" disabled={isSubmitting || cart.length === 0}>
                {isSubmitting ? 'Memproses...' : 'Selesaikan Pesanan'}
            </Button>
      </CardFooter>
      )}
    </Card>
  );
}

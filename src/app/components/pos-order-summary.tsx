
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, Minus, Plus } from 'lucide-react';
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
}

export function PosOrderSummary({ cart, setCart, onCheckout, isSubmitting }: PosOrderSummaryProps) {
  const updateQuantity = (sku: string, newQuantity: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.sku === sku) {
          const clampedQuantity = Math.max(1, Math.min(newQuantity, item.maxStock));
          return { ...item, quantity: clampedQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (sku: string) => {
    setCart(prevCart => prevCart.filter(item => item.sku !== sku));
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card className="sticky top-10 flex flex-col h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle>Pesanan Saat Ini</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
        {cart.length > 0 ? (
          <ScrollArea className="flex-grow p-6 pt-0">
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
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateQuantity(item.sku, parseInt(e.target.value, 10) || 1)}
                      className="h-6 w-12 text-center px-1"
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
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p className="font-semibold">Keranjang Kosong</p>
            <p className="text-sm text-center">Scan atau masukkan SKU untuk menambahkan item.</p>
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

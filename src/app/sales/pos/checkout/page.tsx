
'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type PosCartItem } from '@/app/components/pos-order-summary';
import { PosCheckoutForm } from '@/app/components/pos-checkout-form';


export default function CheckoutPage() {
    const [cart, setCart] = useState<PosCartItem[]>([]);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('posCart');
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                if (parsedCart && parsedCart.length > 0) {
                    setCart(parsedCart);
                } else {
                    router.push('/sales/pos');
                }
            } else {
                 router.push('/sales/pos');
            }
        } catch (error) {
            console.error("Could not load cart from local storage", error);
            localStorage.removeItem('posCart');
            router.push('/sales/pos');
        }
        setMounted(true);
    }, [router]);

    if (!mounted || cart.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-muted/40">
                <div className="text-center">
                    <p>Memuat keranjang...</p>
                </div>
            </div>
        );
    }
  
  return (
    <main className="flex flex-col min-h-screen bg-muted/40">
        <header className="flex items-center justify-between p-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                  <Link href="/sales/pos">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Kembali ke POS</span>
                  </Link>
              </Button>
              <h1 className="text-lg font-bold font-headline text-primary">Checkout</h1>
          </div>
           <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak Struk Terakhir
            </Button>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-xl mx-auto">
               <PosCheckoutForm cart={cart} />
            </div>
        </div>
    </main>
  );
}

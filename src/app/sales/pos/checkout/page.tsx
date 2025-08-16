
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Receipt } from 'lucide-react';
import Link from 'next/link';
import { PosCheckoutForm } from '@/app/components/pos-checkout-form';


export default function PosCheckoutPage() {

  return (
    <main className="flex flex-col h-screen bg-muted/40">
        <header className="flex items-center justify-between p-4 border-b bg-background shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                  <Link href="/sales/pos">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Kembali ke POS</span>
                  </Link>
              </Button>
              <h1 className="text-lg font-bold font-headline text-primary">Checkout</h1>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-md mx-auto">
              <PosCheckoutForm />
            </div>
        </div>
    </main>
  );
}

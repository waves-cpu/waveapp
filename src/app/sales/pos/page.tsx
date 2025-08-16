
'use client';

import React from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { PosCart } from '@/app/components/pos-cart';

export default function PosPage() {
  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        <PosCart />
      </div>
    </AppLayout>
  );
}

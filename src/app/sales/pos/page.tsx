
'use client';

import React from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { PosCart } from '@/app/components/pos-cart';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

export default function PosPage() {
    const { language } = useLanguage();
    const t = translations[language];
  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
         <header className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-bold">{t.pos.title}</h1>
            </div>
            <Link href="/sales/pos/history">
                <Button variant="outline">
                    <History className="mr-2 h-4 w-4" />
                    {t.pos.history}
                </Button>
            </Link>
        </header>
        <PosCart />
      </div>
    </AppLayout>
  );
}

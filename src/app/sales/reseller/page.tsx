
'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { ResellerCart } from '@/app/components/reseller-cart';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { History, Users, UserPlus, Settings } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import type { Reseller } from '@/types';
import { ResellerSelectionDialog } from '@/app/components/reseller-selection-dialog';

export default function ResellerPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { resellers, addReseller } = useInventory();
    const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
    const [isResellerDialogOpen, setResellerDialogOpen] = useState(false);

    const handleSelectReseller = (reseller: Reseller) => {
        setSelectedReseller(reseller);
        setResellerDialogOpen(false);
    };

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
         <header className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-bold">{t.sales.reseller}</h1>
            </div>
            <div className="flex items-center gap-2">
                 <Link href="/sales/settings">
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                    </Button>
                </Link>
                 <Link href="/sales/reseller/history">
                    <Button variant="outline">
                        <History className="mr-2 h-4 w-4" />
                        {t.pos.history}
                    </Button>
                </Link>
                {selectedReseller && (
                    <Button onClick={() => setResellerDialogOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        {selectedReseller.name}
                    </Button>
                )}
            </div>
        </header>
        {selectedReseller ? (
            <ResellerCart reseller={selectedReseller} />
        ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <Users className="h-24 w-24 text-muted-foreground" />
                <h2 className="text-xl font-semibold">{t.reseller.selectTitle}</h2>
                <p className="text-muted-foreground">{t.reseller.selectDescription}</p>
                <Button onClick={() => setResellerDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t.reseller.selectOrCreate}
                </Button>
            </div>
        )}
      </div>
      <ResellerSelectionDialog 
        open={isResellerDialogOpen}
        onOpenChange={setResellerDialogOpen}
        resellers={resellers}
        onSelect={handleSelectReseller}
      />
    </AppLayout>
  );
}

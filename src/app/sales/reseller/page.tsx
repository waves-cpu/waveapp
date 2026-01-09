
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { PosCart } from '@/app/components/pos-cart';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { History, Settings, Users, UserSquare } from 'lucide-react';
import type { Voucher, Reseller } from '@/types';
import { useInventory } from '@/hooks/use-inventory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getResellerTier } from '@/lib/reseller-tiers';

export default function ResellerPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { resellers, loading: inventoryLoading } = useInventory();
    const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);

    const handleSelectReseller = (resellerId: string) => {
        const reseller = resellers.find(r => r.id.toString() === resellerId);
        setSelectedReseller(reseller || null);
    };

    const resellerTier = useMemo(() => {
        if (selectedReseller) {
            return getResellerTier(selectedReseller.totalTransactions);
        }
        return getResellerTier(0);
    }, [selectedReseller]);


  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
         <header className="flex items-center justify-between p-4 border-b shrink-0 no-print">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <UserSquare/>
                    Penjualan Reseller
                </h1>
            </div>
             <div className="flex items-center gap-2">
                 <Select onValueChange={handleSelectReseller} disabled={inventoryLoading}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Pilih Reseller..." />
                    </SelectTrigger>
                    <SelectContent>
                        {resellers.map(reseller => (
                            <SelectItem key={reseller.id} value={reseller.id.toString()}>
                                {reseller.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Link href="/sales/reseller/manage">
                    <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        Kelola Reseller
                    </Button>
                </Link>
            </div>
        </header>
        <PosCart 
            key={selectedReseller?.id} // Re-mount cart when reseller changes
            onVoucherApplied={() => {}} 
            activeVoucher={null}
            reseller={selectedReseller}
            resellerTier={resellerTier}
        />
      </div>
    </AppLayout>
  );
}

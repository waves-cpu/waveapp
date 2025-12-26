
'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Button } from '@/components/ui/button';
import { PlusCircle, Tags } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function DiscountPage() {
    const { language } = useLanguage();
    const t = translations[language];

    // Placeholder for discount groups data
    const [discountGroups, setDiscountGroups] = useState([
        { id: 1, name: 'Diskon Lebaran T-Shirt', productCount: 5, category: 'T-Shirt Oversize' },
        { id: 2, name: 'Promo Akhir Tahun Caps', productCount: 2, category: 'Caps' }
    ]);

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.discounts}</h1>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Grup Diskon Baru
                    </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {discountGroups.map(group => (
                        <Card key={group.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Tags className="h-5 w-5 text-primary" />
                                    {group.name}
                                </CardTitle>
                                <CardDescription>Kategori: {group.category}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    {group.productCount} produk termasuk dalam diskon ini.
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {discountGroups.length === 0 && (
                         <div className="col-span-full text-center py-12 text-muted-foreground">
                            <Tags className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Belum Ada Grup Diskon</h3>
                            <p className="mt-1 text-sm">Buat grup diskon pertama Anda untuk memulai promosi.</p>
                        </div>
                    )}
                </div>

            </main>
        </AppLayout>
    );
}

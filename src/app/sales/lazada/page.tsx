
'use client';

import React from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type ShippingProvider = 'SPX' | 'J&T' | 'JNE' | 'INSTANT' | 'CARGO';

const shippingProviders: { name: ShippingProvider, icon: React.ElementType }[] = [
    { name: 'JNE', icon: ShoppingBag },
    { name: 'J&T', icon: ShoppingBag },
];

export default function LazadaProviderPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const router = useRouter();

    const handleProviderSelect = (provider: ShippingProvider) => {
        const today = format(new Date(), 'MM-dd-yyyy');
        router.push(`/shipping/receipt/${today}?channel=${provider}`);
    };

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                 <div className="flex items-center gap-4 mb-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.sales.lazada}</h1>
                </div>

                <div className="max-w-4xl mx-auto">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pilih Jasa Kirim</CardTitle>
                            <CardDescription>Pilih jasa kirim yang ingin Anda proses untuk kanal Lazada.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {shippingProviders.map(provider => (
                                <Button 
                                    key={provider.name} 
                                    variant="outline" 
                                    className="h-24 bg-card flex-col gap-2 text-base font-semibold"
                                    onClick={() => handleProviderSelect(provider.name)}
                                >
                                    <provider.icon className="h-8 w-8 text-muted-foreground" />
                                    {provider.name}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}

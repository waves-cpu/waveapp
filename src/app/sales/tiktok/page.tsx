
'use client';

import React from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

const shippingProviders = [
    { name: 'J&T', icon: Truck },
    { name: 'JNE', icon: Truck },
];

export default function TiktokHubPage() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <AppLayout>
            <main className="flex min-h-svh flex-1 flex-col gap-4 bg-muted/40 p-4 md:p-10">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                        {t.sales.tiktok} - {t.shipping.receiptPage.title}
                    </h1>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {shippingProviders.map(provider => (
                        <Link href={`/sales/tiktok/${provider.name.toLowerCase()}`} key={provider.name}>
                            <Card className="hover:bg-accent hover:border-primary transition-colors">
                                <CardHeader className="flex flex-col items-center justify-center text-center gap-2">
                                    <provider.icon className="w-10 h-10 text-muted-foreground" />
                                    <CardTitle className="text-base">{provider.name}</CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>
        </AppLayout>
    );
}


'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

const shippingProviders = [
    { name: 'SPX', icon: Truck },
    { name: 'J&T', icon: Truck },
    { name: 'JNE', icon: Truck },
    { name: 'INSTANT', icon: Truck },
    { name: 'CARGO', icon: Truck },
];

export default function MobileHubPage() {
    const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCounts() {
            try {
                const data = await apiFetch('/api/shipping/receipts/counts?status=Terproses');
                if(data && data.shippingChannels) {
                    setPendingCounts(data.shippingChannels);
                } else {
                    setPendingCounts({});
                }
            } catch (error) {
                console.error("Error fetching pending counts:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchCounts();
    }, []);

    const totalPending = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0);

    return (
        <div className="min-h-screen bg-muted/40 p-4">
            <header className="flex items-center justify-center mb-6 pt-4">
                <h1 className="text-xl font-bold text-center">Pilih Jasa Kirim</h1>
            </header>
            <main className="grid grid-cols-1 gap-4">
                 <Link href="/mobile/pending">
                    <Card className="bg-destructive/10 border-destructive hover:bg-destructive/20 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <AlertTriangle className="w-8 h-8 text-destructive" />
                                <div>
                                    <CardTitle className="text-lg text-destructive">Total Resi Tertunda</CardTitle>
                                    <p className="text-xs text-destructive/80">Lihat semua resi yang perlu diproses</p>
                                </div>
                            </div>
                            {loading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <div className="text-3xl font-bold text-destructive">{totalPending}</div>
                            )}
                        </CardHeader>
                    </Card>
                </Link>

                <div className="grid grid-cols-2 gap-4">
                    {shippingProviders.map(provider => {
                        const count = pendingCounts[provider.name.toUpperCase()] || 0;
                        return (
                            <Link href={`/mobile/scan/${encodeURIComponent(provider.name.toLowerCase())}`} key={provider.name}>
                                <Card className="hover:bg-accent hover:border-primary transition-colors aspect-square flex flex-col items-center justify-center">
                                    <CardHeader className="flex flex-col items-center justify-center text-center gap-2 p-4">
                                        <provider.icon className="w-12 h-12 text-muted-foreground" />
                                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                                    </CardHeader>
                                    <div className="pb-4">
                                    {loading ? (
                                        <Skeleton className="h-6 w-20" />
                                    ) : count > 0 && (
                                        <Badge variant="destructive">{count} Tertunda</Badge>
                                    )}
                                    </div>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </main>
        </div>
    );
}

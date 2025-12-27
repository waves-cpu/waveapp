
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';
import { getReceiptCountByStatus } from '@/lib/inventory-service';
import { Badge } from '@/components/ui/badge';

const shippingProviders = [
    { name: 'SPX', icon: Truck },
    { name: 'J&T', icon: Truck },
    { name: 'JNE', icon: Truck },
    { name: 'INSTANT', icon: Truck },
    { name: 'CARGO', icon: Truck },
];

export default async function MobileHubPage() {
    const pendingCounts = await getReceiptCountByStatus('Terproses');

    return (
        <div className="min-h-screen bg-muted/40 p-4">
            <header className="flex items-center justify-center mb-6 pt-4">
                <h1 className="text-xl font-bold text-center">Pilih Jasa Kirim</h1>
            </header>
            <main className="grid grid-cols-2 gap-4">
                {shippingProviders.map(provider => {
                    const count = pendingCounts[provider.name.toUpperCase()] || 0;
                    return (
                        <Link href={`/mobile/scan/${provider.name.toLowerCase()}`} key={provider.name}>
                            <Card className="hover:bg-accent hover:border-primary transition-colors aspect-square flex flex-col items-center justify-center">
                                <CardHeader className="flex flex-col items-center justify-center text-center gap-2 p-4">
                                    <provider.icon className="w-12 h-12 text-muted-foreground" />
                                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                                </CardHeader>
                                <div className="pb-4">
                                {count > 0 && (
                                    <Badge variant="destructive">{count} Siap Kirim</Badge>
                                )}
                                </div>
                            </Card>
                        </Link>
                    )
                })}
            </main>
        </div>
    );
}

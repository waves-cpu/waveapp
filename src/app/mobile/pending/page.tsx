
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ShippingReceipt } from '@/types';
import { format, parseISO } from 'date-fns';
import { apiFetch } from '@/lib/api';

interface GroupedReceipts {
    [key: string]: ShippingReceipt[];
}

export default function PendingReceiptsPage() {
    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function fetchPendingReceipts() {
            setLoading(true);
            try {
                const data = await apiFetch('/api/shipping/receipts?status=Terproses&limit=2000');
                setReceipts(data.receipts || []);
            } catch (error) {
                console.error("Error fetching pending receipts:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchPendingReceipts();
    }, []);

    const filteredAndGroupedReceipts = useMemo(() => {
        const filtered = searchTerm
            ? receipts.filter(r => r.awb.toLowerCase().includes(searchTerm.toLowerCase()))
            : receipts;

        const grouped: GroupedReceipts = {};
        filtered.forEach(receipt => {
            const channel = receipt.channel.toUpperCase();
            if (!grouped[channel]) {
                grouped[channel] = [];
            }
            grouped[channel].push(receipt);
        });

        // Sort groups by key (channel name)
        return Object.keys(grouped)
            .sort()
            .reduce((acc, key) => {
                acc[key] = grouped[key];
                return acc;
            }, {} as GroupedReceipts);
    }, [receipts, searchTerm]);

    return (
        <div className="min-h-screen bg-muted/40 p-4">
            <header className="flex items-center justify-between mb-4">
                 <Link href="/mobile">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold">Resi Tertunda</h1>
                 <div className="w-9 h-9" />
            </header>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari No. Resi..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <main className="space-y-4">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : Object.keys(filteredAndGroupedReceipts).length > 0 ? (
                    Object.entries(filteredAndGroupedReceipts).map(([channel, channelReceipts]) => (
                        <Card key={channel}>
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <CardTitle className="text-base">{channel}</CardTitle>
                                <Badge variant="secondary">{channelReceipts.length} Resi</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="divide-y">
                                    {channelReceipts.map(receipt => (
                                        <li key={receipt.id} className="px-4 py-2 text-sm">
                                            <p className="font-mono font-medium">{receipt.awb}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {receipt.salesChannel} - {format(parseISO(receipt.date), 'dd MMM yyyy')}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">Tidak ada resi tertunda.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

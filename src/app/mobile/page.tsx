
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt } from '@/types';
import { format } from 'date-fns';

type ShippingProvider = 'Shopee' | 'Tokopedia' | 'Lazada' | 'Tiktok Shop' | 'Manual';

export default function MobileScanReceiptPage() {
    const router = useRouter();
    const { addShippingReceipt } = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, initializeAudio } = useScanSounds();

    const [awb, setAwb] = useState('');
    const [channel, setChannel] = useState<ShippingProvider>('Shopee');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<ShippingReceipt[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        initializeAudio();
        inputRef.current?.focus();
    }, [initializeAudio]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!awb.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const newReceipt: Omit<ShippingReceipt, 'id'> = {
            awb: awb.trim(),
            channel,
            date: new Date().toISOString(),
            status: 'Perlu Diproses'
        };

        try {
            await addShippingReceipt(newReceipt);
            playSuccessSound();
            setRecentlyAdded(prev => [{ ...newReceipt, id: Date.now() }, ...prev].slice(0, 10)); // Optimistic update
            setAwb('');
        } catch (error) {
            playErrorSound();
            const errorMessage = error instanceof Error && error.message.includes('UNIQUE constraint failed')
                ? `Resi ${awb.trim()} sudah pernah di-scan.`
                : 'Gagal menyimpan resi.';
            toast({
                variant: 'destructive',
                title: 'Input Gagal',
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [awb, channel, isSubmitting, addShippingReceipt, playSuccessSound, playErrorSound, toast]);

    return (
        <div className="min-h-screen bg-muted flex flex-col p-4">
            <header className="flex items-center mb-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/shipping/receipt')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold ml-2">Scan Resi</h1>
            </header>

            <main className="flex-grow flex flex-col gap-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Scan atau ketik No. Resi (AWB)"
                            className="pl-10 text-base h-12"
                            value={awb}
                            onChange={(e) => setAwb(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {(['Shopee', 'Tokopedia', 'Lazada', 'Tiktok Shop', 'Manual'] as ShippingProvider[]).map(c => (
                             <Button
                                key={c}
                                type="button"
                                variant={channel === c ? 'default' : 'outline'}
                                onClick={() => setChannel(c)}
                                className="h-12 text-xs sm:text-sm"
                            >
                                {c}
                            </Button>
                        ))}
                    </div>
                </form>

                <Card className="flex-grow">
                    <CardHeader>
                        <CardTitle className="text-base">Baru Saja Di-scan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentlyAdded.length === 0 ? (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>Belum ada resi yang di-scan hari ini.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {recentlyAdded.map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-secondary/50 p-2 rounded-md text-sm">
                                        <div>
                                            <p className="font-semibold">{item.awb}</p>
                                            <p className="text-xs text-muted-foreground">{item.channel}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'HH:mm:ss')}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

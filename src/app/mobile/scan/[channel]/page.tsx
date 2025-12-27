
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ScanLine, Camera, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt } from '@/types';
import { format, parseISO } from 'date-fns';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { Badge } from '@/components/ui/badge';
import { useParams, useRouter } from 'next/navigation';

export default function MobileScanShipmentPage() {
    const { updateShippingReceiptStatus, findShippingReceiptByAwb } = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, initializeAudio } = useScanSounds();
    const router = useRouter();
    const params = useParams();
    const channel = typeof params.channel === 'string' ? params.channel.toUpperCase() : '';


    const [awb, setAwb] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentlyProcessed, setRecentlyProcessed] = useState<(ShippingReceipt & { success: boolean; message: string })[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanningPaused, setIsScanningPaused] = useState(false);

    useEffect(() => {
        initializeAudio();
    }, [initializeAudio]);
    
    useEffect(() => {
        if(!isCameraOpen) {
            inputRef.current?.focus();
        }
    }, [isCameraOpen]);

    const processAwb = useCallback(async (scannedAwb: string) => {
        const trimmedAwb = scannedAwb.trim();
        if (!trimmedAwb) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        
        try {
            const receipt = await findShippingReceiptByAwb(trimmedAwb);

            if (!receipt) {
                throw new Error('Resi tidak ditemukan di sistem.');
            }

            if (receipt.channel.toUpperCase() !== channel) {
                throw new Error(`Resi ini untuk ${receipt.channel}, bukan ${channel}.`);
            }

            if (receipt.status !== 'Terproses') {
                if (receipt.status === 'Siap Kirim') {
                    throw new Error('Resi ini sudah siap kirim.');
                }
                throw new Error(`Status resi saat ini adalah "${receipt.status}", tidak bisa diubah.`);
            }

            await updateShippingReceiptStatus(receipt.id, 'Siap Kirim');
            playSuccessSound();
            const successMessage = 'Berhasil diubah menjadi "Siap Kirim".';
            toast({ title: `Resi ${trimmedAwb}`, description: successMessage });
            setRecentlyProcessed(prev => [{ ...receipt, success: true, message: successMessage, status: 'Siap Kirim' }, ...prev].slice(0, 20));

        } catch (error: any) {
            playErrorSound();
            const errorMessage = error.message || 'Terjadi kesalahan.';
            toast({
                variant: 'destructive',
                title: `Resi ${trimmedAwb}`,
                description: errorMessage,
            });
            const failedReceipt: Partial<ShippingReceipt> = {
                id: Date.now(), // Temporary ID for list key
                awb: trimmedAwb,
                date: new Date().toISOString(),
                channel: 'N/A',
                status: 'Error',
            };
            setRecentlyProcessed(prev => [{ ...(failedReceipt as ShippingReceipt), success: false, message: errorMessage }, ...prev].slice(0, 20));
        } finally {
            setIsSubmitting(false);
            if (isCameraOpen) {
                 setIsScanningPaused(true); // Pause scanning after a result
                 setTimeout(() => setIsScanningPaused(false), 1500); // Resume after 1.5s
            } else {
                 setAwb('');
                 inputRef.current?.focus();
            }
        }
    }, [isSubmitting, findShippingReceiptByAwb, updateShippingReceiptStatus, playSuccessSound, playErrorSound, toast, isCameraOpen, channel]);


    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processAwb(awb);
    }
    
    const handleDecode = (result: string) => {
        if (isScanningPaused) return;
        processAwb(result);
    };
    
    if (isCameraOpen) {
        return (
             <div className="min-h-screen bg-black text-white flex flex-col">
                <header className="absolute top-0 left-0 right-0 z-10 flex items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
                     <Button variant="ghost" size="icon" onClick={() => setIsCameraOpen(false)} className="rounded-full hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold ml-2">Pindai Resi {channel}</h1>
                </header>
                 <main className="flex-grow flex flex-col justify-center items-center relative">
                    <div className="absolute inset-0">
                        <QrScanner
                            onDecode={handleDecode}
                            onError={(error) => console.log(error?.message)}
                            constraints={{ facingMode: 'environment' }}
                            containerStyle={{ width: '100%', height: '100%', paddingTop: '0' }}
                            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                     <p className="absolute bottom-8 text-sm bg-black/50 px-3 py-1.5 rounded-md">Posisikan barcode di dalam frame</p>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted flex flex-col p-4">
            <header className="flex items-center justify-between mb-4">
                 <Button variant="ghost" size="icon" onClick={() => router.push('/mobile')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold">Proses Kirim {channel}</h1>
                 <div className="w-9 h-9" />
            </header>

            <main className="flex-grow flex flex-col gap-4">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                placeholder="Pindai resi untuk dikirim"
                                className="pl-10 text-base h-12"
                                value={awb}
                                onChange={(e) => setAwb(e.target.value)}
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>
                        <Button type="button" size="icon" className="h-12 w-12 shrink-0" onClick={() => setIsCameraOpen(true)}>
                            <Camera className="h-6 w-6" />
                        </Button>
                    </div>
                </form>

                <Card className="flex-grow">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Hasil Pemindaian</CardTitle>
                        {recentlyProcessed.length > 0 && (
                            <Badge variant="secondary">{recentlyProcessed.length}</Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        {recentlyProcessed.length === 0 ? (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>Hasil pemindaian akan muncul di sini.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {recentlyProcessed.map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-secondary/50 p-2 rounded-md text-sm">
                                        <div className="flex items-center gap-3">
                                            {item.success ? 
                                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" /> : 
                                                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                            }
                                            <div>
                                                <p className="font-semibold">{item.awb}</p>
                                                <p className="text-xs text-muted-foreground">{item.message}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0">{format(parseISO(item.date), 'HH:mm:ss')}</p>
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


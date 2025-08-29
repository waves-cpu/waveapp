
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ScanLine, Camera, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt } from '@/types';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


type ShippingProvider = 'Shopee' | 'Tiktok' | 'Lazada' | 'Instant';

export default function MobileScanReceiptPage() {
    const router = useRouter();
    const { addShippingReceipt } = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, initializeAudio } = useScanSounds();

    const [awb, setAwb] = useState('');
    const [channel, setChannel] = useState<ShippingProvider>('Shopee');
    const [scanDate, setScanDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<ShippingReceipt[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        initializeAudio();
        inputRef.current?.focus();
    }, [initializeAudio]);

    const handleSubmit = useCallback(async (scannedAwb: string) => {
        if (!scannedAwb.trim()) return;

        // Prevent rapid re-submission while one is in progress
        if (isSubmitting) return;

        setIsSubmitting(true);
        // Pass the selected date as a 'yyyy-MM-dd' string to avoid timezone issues.
        const newReceipt: Omit<ShippingReceipt, 'id'> = {
            awb: scannedAwb.trim(),
            channel,
            date: format(scanDate, 'yyyy-MM-dd'),
            status: 'Perlu Diproses'
        };

        try {
            const added = await addShippingReceipt(newReceipt);
            playSuccessSound();
            setRecentlyAdded(prev => [added, ...prev].slice(0, 10));
            setAwb('');
        } catch (error) {
            playErrorSound();
            const errorMessage = error instanceof Error && error.message.includes('UNIQUE constraint failed')
                ? `Resi ${scannedAwb.trim()} sudah pernah di-scan.`
                : 'Gagal menyimpan resi.';
            toast({
                variant: 'destructive',
                title: 'Input Gagal',
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
            if (isCameraOpen) {
                 // Do not close camera, allow for next scan
            } else {
                 inputRef.current?.focus();
            }
        }
    }, [channel, isSubmitting, addShippingReceipt, playSuccessSound, playErrorSound, toast, isCameraOpen, scanDate]);


    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit(awb);
    }
    
    const handleDecode = (result: string) => {
        handleSubmit(result);
    };

    if (isCameraOpen) {
        return (
             <div className="min-h-screen bg-black text-white flex flex-col">
                <header className="absolute top-0 left-0 right-0 z-10 flex items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
                     <Button variant="ghost" size="icon" onClick={() => setIsCameraOpen(false)} className="rounded-full hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold ml-2">Scan Barcode</h1>
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
                <h1 className="text-lg font-bold">Scan Resi</h1>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[150px] justify-start text-left font-normal h-9",
                        !scanDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scanDate ? format(scanDate, "d MMM yyyy") : <span>Pilih tanggal</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={scanDate}
                        onSelect={(date) => setScanDate(date || new Date())}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </header>

            <main className="flex-grow flex flex-col gap-4">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
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
                        <Button type="button" size="icon" className="h-12 w-12 shrink-0" onClick={() => setIsCameraOpen(true)}>
                            <Camera className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {(['Shopee', 'Tiktok', 'Lazada', 'Instant'] as ShippingProvider[]).map(c => (
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

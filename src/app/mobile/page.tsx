
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ScanLine, Camera, Calendar as CalendarIcon, ShoppingBag, Truck, X } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt } from '@/types';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';

type ShippingProvider = 'Shopee' | 'Tiktok' | 'Lazada' | 'Instant' | 'Tokopedia';

const shippingProviders: { name: ShippingProvider, icon: React.ElementType }[] = [
    { name: 'Shopee', icon: ShoppingBag },
    { name: 'Tiktok', icon: ShoppingBag },
    { name: 'Lazada', icon: ShoppingBag },
    { name: 'Tokopedia', icon: ShoppingBag },
    { name: 'Instant', icon: Truck },
];

const ScannerComponent = ({ onScanSuccess, onScanError, onClose }: { onScanSuccess: (text: string) => void, onScanError: (error: string) => void, onClose: () => void }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const scannerRegionId = "html5qr-code-full-region";

    useEffect(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                scannerRegionId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    rememberLastUsedCamera: true,
                    supportedScanTypes: [],
                },
                false // verbose
            );

            const successCallback = (decodedText: string, decodedResult: any) => {
                onScanSuccess(decodedText);
            };

            const errorCallback = (errorMessage: string) => {
                // We can ignore common errors or handle them if needed
            };
            
            scanner.render(successCallback, errorCallback);
            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [onScanSuccess, onScanError]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div id={scannerRegionId} className="w-full flex-grow"></div>
             <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white opacity-70 ring-offset-background transition-opacity hover:opacity-100 h-9 w-9">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
            </Button>
        </div>
    );
};


export default function MobileScanReceiptPage() {
    const { addShippingReceipt } = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, initializeAudio } = useScanSounds();

    const [selectedChannel, setSelectedChannel] = useState<ShippingProvider | null>(null);
    const [awb, setAwb] = useState('');
    const [scanDate, setScanDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<ShippingReceipt[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isContextSecure, setIsContextSecure] = useState(true);

    useEffect(() => {
        initializeAudio();
        if (typeof window !== 'undefined') {
            setIsContextSecure(window.isSecureContext);
        }
    }, [initializeAudio]);
    
    useEffect(() => {
        if(selectedChannel && !isCameraOpen) {
            inputRef.current?.focus();
        }
    }, [selectedChannel, isCameraOpen]);

    const handleSubmit = useCallback(async (scannedAwb: string) => {
        if (!scannedAwb.trim() || !selectedChannel) return;
        
        const newReceipt: Omit<ShippingReceipt, 'id'> = {
            awb: scannedAwb.trim(),
            channel: selectedChannel,
            date: format(scanDate, "yyyy-MM-dd'T'HH:mm:ss"),
            status: 'Perlu Diproses'
        };

        try {
            const added = await addShippingReceipt(newReceipt);
            playSuccessSound();
            setRecentlyAdded(prev => [added, ...prev].slice(0, 10));
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
        }
    }, [selectedChannel, scanDate, addShippingReceipt, playSuccessSound, playErrorSound, toast]);


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await handleSubmit(awb);
        setAwb('');
        setIsSubmitting(false);
        inputRef.current?.focus();
    }
    
    const handleScanError = (error: string) => {
        playErrorSound();
        console.error("Scan error:", error);
        toast({
            variant: "destructive",
            title: "Scan Error",
            description: error || 'Gagal memindai.',
        });
    };
    
    if (!selectedChannel) {
        return (
            <div className="min-h-screen bg-muted flex flex-col p-4">
                 <header className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-bold">Pilih Jasa Kirim</h1>
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
                <main className="flex-grow grid grid-cols-2 gap-4">
                    {shippingProviders.map(provider => (
                        <Button 
                            key={provider.name} 
                            variant="outline" 
                            className="h-full bg-card flex-col gap-2 text-base font-semibold"
                            onClick={() => setSelectedChannel(provider.name)}
                        >
                            <provider.icon className="h-8 w-8 text-muted-foreground" />
                            {provider.name}
                        </Button>
                    ))}
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted flex flex-col p-4">
             {isCameraOpen && (
                <ScannerComponent 
                    onScanSuccess={handleSubmit}
                    onScanError={handleScanError}
                    onClose={() => setIsCameraOpen(false)}
                />
             )}
            <header className="flex items-center justify-between mb-4">
                 <Button variant="ghost" size="icon" onClick={() => setSelectedChannel(null)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold">Scan Resi {selectedChannel}</h1>
                 <div className="w-9 h-9" />
            </header>

            <main className="flex-grow flex flex-col gap-4">
                {!isContextSecure && (
                    <Alert variant="destructive">
                        <AlertTitle>Koneksi Tidak Aman (HTTP)</AlertTitle>
                        <AlertDescription>
                            Akses kamera dinonaktifkan oleh browser. Harap gunakan koneksi HTTPS atau akses melalui localhost untuk mengaktifkan pemindai.
                        </AlertDescription>
                    </Alert>
                )}
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
                        <Button type="button" size="icon" className="h-12 w-12 shrink-0" onClick={() => setIsCameraOpen(true)} disabled={!isContextSecure}>
                            <Camera className="h-6 w-6" />
                        </Button>
                    </div>
                </form>

                <Card className="flex-grow">
                    <CardHeader>
                        <CardTitle className="text-base">Baru Saja Di-scan ({selectedChannel})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentlyAdded.length === 0 ? (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>Belum ada resi yang di-scan untuk channel ini.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {recentlyAdded.filter(r => r.channel === selectedChannel).map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-secondary/50 p-2 rounded-md text-sm">
                                        <div>
                                            <p className="font-semibold">{item.awb}</p>
                                            <p className="text-xs text-muted-foreground">{item.channel}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(item.date), 'HH:mm:ss')}</p>
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

    
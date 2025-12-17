
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ScanLine, Camera, Calendar as CalendarIcon, ShoppingBag, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt } from '@/types';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';

type ShippingProvider = 'SPX' | 'J&T' | 'JNE' | 'INSTANT' | 'CARGO';

const shippingProviders: { name: ShippingProvider, icon: React.ElementType }[] = [
    { name: 'SPX', icon: ShoppingBag },
    { name: 'J&T', icon: ShoppingBag },
    { name: 'JNE', icon: ShoppingBag },
    { name: 'INSTANT', icon: Truck },
    { name: 'CARGO', icon: Truck },
];

export default function DesktopScanReceiptPage() {
    const { addShippingReceipt } = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, initializeAudio } = useScanSounds();
    const router = useRouter();

    const [selectedChannel, setSelectedChannel] = useState<ShippingProvider | null>(null);
    const [awb, setAwb] = useState('');
    const [scanDate, setScanDate] = useState<Date>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<ShippingReceipt[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isScanningPaused, setIsScanningPaused] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    useEffect(() => {
        initializeAudio();
    }, [initializeAudio]);
    
    useEffect(() => {
        if(selectedChannel) {
            inputRef.current?.focus();
        }
    }, [selectedChannel, isCameraOpen]);

    const checkCameraPermission = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setHasCameraPermission(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop using the camera immediately
            setHasCameraPermission(true);
        } catch (error) {
            setHasCameraPermission(false);
        }
    }, []);

    const handleSubmit = useCallback(async (scannedAwb: string) => {
        const trimmedAwb = scannedAwb.trim();
        if (!trimmedAwb || !selectedChannel) return;
        if (isSubmitting) return;

        // Client-side duplicate check
        const recentDuplicate = recentlyAdded.find(receipt => receipt.awb === trimmedAwb);
        if (recentDuplicate) {
            playErrorSound();
            toast({
                variant: 'destructive',
                title: 'Resi Duplikat',
                description: `Resi ini sudah discan pada ${format(parseISO(recentDuplicate.date), 'dd MMM yyyy, HH:mm')}`,
            });
             if (isCameraOpen) {
                // Allow for next scan without closing camera
            } else {
                setAwb(''); // Clear input for next scan
                inputRef.current?.focus();
            }
            return;
        }

        setIsSubmitting(true);
        
        const newReceipt: Omit<ShippingReceipt, 'id'> = {
            awb: trimmedAwb,
            channel: selectedChannel,
            date: format(scanDate, "yyyy-MM-dd'T'HH:mm:ss"),
            status: 'Perlu Diproses'
        };

        try {
            const added = await addShippingReceipt(newReceipt);
            playSuccessSound();
            setRecentlyAdded(prev => [added, ...prev].slice(0, 10));
            setAwb('');
        } catch (error) {
            playErrorSound();
            let title = 'Input Gagal';
            let errorMessage = 'Gagal menyimpan resi.';

            if (error instanceof Error && error.message.startsWith('DUPLICATE_AWB_DATE::')) {
                const dateStr = error.message.split('::')[1];
                title = 'Resi Duplikat';
                errorMessage = `Resi ini sudah discan pada ${format(parseISO(dateStr), 'dd MMM yyyy, HH:mm')}`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            toast({
                variant: 'destructive',
                title: title,
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
            if (!isCameraOpen) {
                 inputRef.current?.focus();
            }
        }
    }, [isSubmitting, selectedChannel, scanDate, addShippingReceipt, playSuccessSound, playErrorSound, toast, isCameraOpen, recentlyAdded]);


    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit(awb);
    }
    
    const handleDecode = (result: string) => {
        if (isScanningPaused) return;

        setIsScanningPaused(true);
        handleSubmit(result);

        setTimeout(() => {
            setIsScanningPaused(false);
        }, 2000); // 2 second delay
    };

    const handleCameraToggle = () => {
        if (isCameraOpen) {
            setIsCameraOpen(false);
        } else {
            checkCameraPermission().then(() => {
                setIsCameraOpen(true);
            });
        }
    }
    
    if (!selectedChannel) {
        return (
            <AppLayout>
                 <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Pilih Jasa Kirim</h1>
                    </div>
                    <div className="max-w-2xl mx-auto">
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-base">Pilih Tanggal Scan</CardTitle>
                                <CardDescription>Semua resi yang discan akan tercatat pada tanggal yang dipilih.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !scanDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {scanDate ? format(scanDate, "d MMM yyyy") : <span>Pilih tanggal</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={scanDate}
                                        onSelect={(date) => setScanDate(date || new Date())}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                            </CardContent>
                        </Card>
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-base">Pilih Jasa Kirim</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {shippingProviders.map(provider => (
                                    <Button 
                                        key={provider.name} 
                                        variant="outline" 
                                        className="h-24 bg-card flex-col gap-2 text-base font-semibold"
                                        onClick={() => setSelectedChannel(provider.name)}
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
        )
    }

    return (
        <AppLayout>
            <main className="flex min-h-screen flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                     <Button variant="ghost" size="icon" onClick={() => setSelectedChannel(null)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                        Scan Resi - {selectedChannel}
                    </h1>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
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
                                        autoFocus
                                    />
                                </div>
                                <Button type="button" size="icon" className="h-12 w-12 shrink-0" onClick={handleCameraToggle}>
                                    <Camera className="h-6 w-6" />
                                </Button>
                            </div>
                        </form>

                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-base">Baru Saja Di-scan ({selectedChannel})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentlyAdded.length === 0 ? (
                                     <div className="text-center py-10 text-muted-foreground">
                                        <p>Belum ada resi yang di-scan.</p>
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
                    </div>

                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Tampilan Kamera</CardTitle>
                            </CardHeader>
                             <CardContent>
                                {isCameraOpen ? (
                                     hasCameraPermission === false ? (
                                         <div className="aspect-video bg-black text-white flex flex-col items-center justify-center rounded-md">
                                             <p>Kamera tidak terdeteksi atau izin ditolak.</p>
                                             <p className="text-xs text-muted-foreground">Pastikan Anda telah memberikan izin kamera di browser.</p>
                                         </div>
                                     ) : (
                                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                                            <QrScanner
                                                onDecode={handleDecode}
                                                onError={(error) => console.log(error?.message)}
                                                constraints={{ facingMode: 'environment' }}
                                                containerStyle={{ width: '100%', height: '100%', paddingTop: '0' }}
                                                videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                     )
                                ) : (
                                    <div className="aspect-video bg-muted flex items-center justify-center rounded-md">
                                        <p className="text-muted-foreground">Kamera tidak aktif</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </main>
        </AppLayout>
    );
}

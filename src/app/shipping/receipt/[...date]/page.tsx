
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, FilePlus2, Loader2, AlertCircle, Truck, PackageCheck, Undo2, Ban, History, CheckCircle, ShoppingBag, Package } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { isValid, parseISO } from 'date-fns';
import { cn, formatToWIB } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';
import type { PrintedReceiptCount, ShippingReceiptCounts } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessedReceiptsDialog } from '@/app/components/processed-receipts-dialog';
import { Separator } from '@/components/ui/separator';

const SHIPPING_CHANNEL_OPTIONS = ['Semua Jasa Kirim', 'SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'];
const CORE_STATUSES = ['Terproses', 'Siap Kirim', 'Selesai', 'Return', 'Dibatalkan', 'Return Selesai'];
const STATUS_ORDER = ['Terproses', 'Siap Kirim', 'Selesai', 'Diantar', 'Return Selesai', 'Return', 'Dibatalkan', 'Tidak Sampai'];


function parseDateFromParams(dateArray: string[] | undefined): Date | null {
    if (dateArray && dateArray.length > 0) {
      if (dateArray[0] === 'semua') return null;
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parseISO(`${year}-${month}-${day}`);
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
}

function AddPrintedReceiptDialog({
    isOpen,
    setIsOpen,
    onSave,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onSave: (salesChannel: string, shippingChannel: string, count: number) => Promise<void>;
}) {
    const [salesChannel, setSalesChannel] = useState('');
    const [shippingChannel, setShippingChannel] = useState('');
    const [count, setCount] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSalesChannel('');
            setShippingChannel('');
            setCount('');
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!salesChannel || !shippingChannel || !count || count <= 0) return;
        setIsSaving(true);
        await onSave(salesChannel, shippingChannel, count);
        setIsSaving(false);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Input Resi Tercetak
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Input Resi Tercetak</DialogTitle>
                    <DialogDescription>
                        Masukkan jumlah resi yang baru saja Anda cetak dari marketplace.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="space-y-2">
                        <Label htmlFor="salesChannel">Kanal Penjualan</Label>
                        <Select value={salesChannel} onValueChange={setSalesChannel} required>
                            <SelectTrigger id="salesChannel">
                                <SelectValue placeholder="Pilih Kanal Penjualan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Shopee">Shopee</SelectItem>
                                <SelectItem value="Tiktok">Tiktok</SelectItem>
                                <SelectItem value="Lazada">Lazada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="shippingChannel">Jasa Kirim</Label>
                        <Select value={shippingChannel} onValueChange={setShippingChannel} required>
                            <SelectTrigger id="shippingChannel">
                                <SelectValue placeholder="Pilih Jasa Kirim" />
                            </SelectTrigger>
                            <SelectContent>
                                {SHIPPING_CHANNEL_OPTIONS.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="count">Jumlah Resi</Label>
                        <Input
                            id="count"
                            type="number"
                            placeholder="e.g. 50"
                            value={count}
                            onChange={(e) => setCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                            min="1"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving}>Batal</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const statusIcons: { [key: string]: React.ElementType } = {
    'Terproses': Truck,
    'Siap Kirim': Truck,
    'Selesai': CheckCircle,
    'Return': Undo2,
    'Return Selesai': History,
    'Dibatalkan': Ban,
    'Tidak Sampai': Ban,
    'Diantar': Truck,
};


export default function ReceiptPage() {
    const { 
        addPrintedReceipts,
        getPrintedReceiptCountsForDate,
        fetchShippingReceiptCounts,
    } = useInventory();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const { language } = useLanguage();
    const t = translations[language];


    const [isAddPrintedOpen, setAddPrintedOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [statusCounts, setStatusCounts] = useState<ShippingReceiptCounts>({
        pendingToday: 0,
        pendingBefore: 0,
        statuses: {},
        shippingChannels: {},
        salesChannels: {},
        shippingChannelsBySalesChannel: {}
    });
    const [printedReceiptCounts, setPrintedReceiptCounts] = useState<PrintedReceiptCount[]>([]);
    const [countsLoading, setCountsLoading] = useState(true);
    const [shippingChannel, setShippingChannel] = useState<string | null>(null);
    

    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);
    
    const fetchAllCounts = useCallback(async () => {
        setCountsLoading(true);
        const dateString = currentDate ? formatToWIB(currentDate, 'yyyy-MM-dd') : undefined;
        try {
            const fetchParams: { dateString?: string; shippingChannel?: string } = {
                dateString: dateString,
                shippingChannel: (shippingChannel && shippingChannel !== 'Semua Jasa Kirim') 
                                 ? shippingChannel 
                                 : undefined
            };
    
            const statusData = await fetchShippingReceiptCounts(fetchParams);
            setStatusCounts(statusData);
    
            if (dateString) {
                const printedData = await getPrintedReceiptCountsForDate(dateString);
                setPrintedReceiptCounts(printedData);
            } else {
                setPrintedReceiptCounts([]);
            }
    
        } catch (error) {
             toast({ variant: 'destructive', title: "Gagal memuat statistik resi" });
        } finally {
            setCountsLoading(false);
        }
    }, [currentDate, shippingChannel, fetchShippingReceiptCounts, getPrintedReceiptCountsForDate, toast]);


    useEffect(() => {
        fetchAllCounts();
    }, [fetchAllCounts]);

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = formatToWIB(selectedDate, 'MM-dd-yyyy');
            router.push(`/shipping/receipt/${formattedDate}`);
        } else {
            router.push('/shipping/receipt/semua');
        }
    };
    
    const handleAddPrintedReceipts = async (salesChannel: string, shippingChannel: string, count: number) => {
        if (!currentDate) return;
        const dateString = formatToWIB(currentDate, 'yyyy-MM-dd');
        await addPrintedReceipts(dateString, salesChannel, shippingChannel, count);
        await fetchAllCounts();
        toast({ title: 'Berhasil', description: `${count} resi tercetak telah ditambahkan.` });
    };
    
    const handleShowAllPending = () => {
        router.push('/shipping/receipt/semua');
        setSelectedStatus('Tertunda'); 
    };

    const orderedStatuses = useMemo(() => {
        return STATUS_ORDER.filter(status => {
            return CORE_STATUSES.includes(status) || (statusCounts.statuses?.[status] > 0);
        });
    }, [statusCounts.statuses]);
    
    const groupedPrintedReceipts = useMemo(() => {
        const groups: Record<string, { salesChannel: string; items: { shippingChannel: string; count: number }[] }> = {};
        printedReceiptCounts.forEach(item => {
            if (!groups[item.salesChannel]) {
                groups[item.salesChannel] = { salesChannel: item.salesChannel, items: [] };
            }
            groups[item.salesChannel].items.push({ shippingChannel: item.shippingChannel, count: item.count });
        });

        return Object.values(groups);
    }, [printedReceiptCounts]);

    return (
        <>
            <AppLayout>
                <main className="flex min-h-screen flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                               {t.shipping.receiptPage.title}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={'outline'}
                                    size="sm"
                                    className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                    !currentDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {currentDate ? formatToWIB(currentDate, 'PPP') : <span>{t.shipping.receiptPage.selectDate}</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={currentDate || undefined}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                             <Select onValueChange={(v) => setShippingChannel(v === 'Semua Jasa Kirim' ? null : v)} value={shippingChannel || 'Semua Jasa Kirim'}>
                                <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHIPPING_CHANNEL_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <AddPrintedReceiptDialog isOpen={isAddPrintedOpen} setIsOpen={setAddPrintedOpen} onSave={handleAddPrintedReceipts} />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                        <div className="lg:col-span-2 space-y-6">
                             {statusCounts.pendingBefore > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Pekerjaan Tertunda</AlertTitle>
                                    <AlertDescription className="flex justify-between items-center">
                                        Anda memiliki {statusCounts.pendingBefore} resi dari hari sebelumnya yang belum diproses.
                                        <Button variant="secondary" size="sm" onClick={handleShowAllPending}>Lihat & Proses Sekarang</Button>
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                {orderedStatuses.map(status => {
                                    const Icon = statusIcons[status] || Package;
                                    const isPendingToday = status === 'Terproses' && statusCounts.pendingToday > 0;
                                    const isPendingOld = status === 'Terproses' && statusCounts.pendingBefore > 0;
                                    let count = isPendingToday ? statusCounts.pendingToday : (statusCounts.statuses?.[status] || 0);
                                    let statusText = isPendingToday ? 'Terproses Hari Ini' : status;
                                    
                                    const cardsToRender = [];
                                    
                                    if(isPendingToday) {
                                         cardsToRender.push(
                                            <Card
                                                key="pending-today"
                                                className={cn("transition-all", count > 0 && "cursor-pointer hover:bg-accent hover:border-primary")}
                                                onClick={() => count > 0 && setSelectedStatus('Terproses Hari Ini')}
                                            >
                                                <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                                                    <Icon className="h-6 w-6 text-yellow-600" />
                                                    <div className="text-3xl font-bold">
                                                        {countsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : count}
                                                    </div>
                                                    <p className="text-sm font-medium text-muted-foreground">{statusText}</p>
                                                </CardContent>
                                            </Card>
                                        );
                                    }

                                    if(isPendingOld) {
                                         cardsToRender.push(
                                            <Card
                                                key="pending-old"
                                                className={cn("transition-all", statusCounts.pendingBefore > 0 && "cursor-pointer hover:bg-accent hover:border-primary")}
                                                onClick={() => statusCounts.pendingBefore > 0 && setSelectedStatus('Tertunda')}
                                            >
                                                <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                                                    <Icon className="h-6 w-6 text-red-600" />
                                                    <div className="text-3xl font-bold">
                                                        {countsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : statusCounts.pendingBefore}
                                                    </div>
                                                    <p className="text-sm font-medium text-muted-foreground">Tertunda</p>
                                                </CardContent>
                                            </Card>
                                        );
                                    }

                                    if(status !== 'Terproses') {
                                         cardsToRender.push(
                                             <Card
                                                key={status}
                                                className={cn("transition-all", count > 0 && "cursor-pointer hover:bg-accent hover:border-primary")}
                                                onClick={() => count > 0 && setSelectedStatus(status)}
                                            >
                                                <CardContent className="flex flex-col items-center justify-center p-6 gap-2 text-center">
                                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                                    <div className="text-3xl font-bold">
                                                        {countsLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : count}
                                                    </div>
                                                    <p className="text-sm font-medium text-muted-foreground">{status}</p>
                                                </CardContent>
                                            </Card>
                                         );
                                    }
                                    
                                    return cardsToRender;
                                })}
                            </div>
                        </div>
                         <div className="lg:col-span-1">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Ringkasan Resi Tercetak</CardTitle>
                                    <CardDescription>Sisa resi yang perlu diproses hari ini.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {countsLoading ? (
                                        <div className="text-center py-10 text-muted-foreground">Memuat data...</div>
                                    ) : groupedPrintedReceipts.length > 0 ? (
                                        <div className="space-y-4">
                                            {groupedPrintedReceipts.map(group => {
                                                return (
                                                <div key={group.salesChannel}>
                                                    <h3 className="font-semibold text-sm mb-2 flex items-center">
                                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                                        {group.salesChannel}
                                                    </h3>
                                                    <div className="pl-4 border-l ml-2 space-y-2">
                                                        {group.items.map(item => {
                                                            const shippingChannelData = statusCounts.shippingChannelsBySalesChannel?.[group.salesChannel] || {};
                                                            const totalUsedForThisCombo = shippingChannelData[item.shippingChannel] || 0;

                                                            const remaining = Math.max(0, item.count - totalUsedForThisCombo);
                                                            const isCritical = remaining > 0 && remaining <= 5;
                                                            
                                                            return (
                                                                <div key={item.shippingChannel} className="flex justify-between items-center text-sm">
                                                                    <span className="text-muted-foreground">{item.shippingChannel}</span>
                                                                    <span className={cn(
                                                                        "font-medium",
                                                                        isCritical ? "text-orange-600 animate-pulse" : "",
                                                                        remaining === 0 ? "text-green-600" : ""
                                                                    )}>
                                                                        {remaining === 0 ? 'Selesai' : `${remaining} / ${item.count}`}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            Belum ada data resi tercetak untuk hari ini.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                </main>
            </AppLayout>
            <ProcessedReceiptsDialog
                open={!!selectedStatus}
                onOpenChange={(isOpen) => !isOpen && setSelectedStatus(null)}
                currentDate={currentDate}
                onDataChange={fetchAllCounts}
                initialStatusFilter={selectedStatus}
                initialChannelFilter={shippingChannel}
            />
        </>
    );
}

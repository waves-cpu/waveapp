
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FilePlus2, Package, Loader2, AlertCircle, Truck, PackageCheck, Undo2, Ban, History, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInventory } from '@/hooks/use-inventory';
import type { PrintedReceiptCount } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessedReceiptsDialog } from '@/app/components/processed-receipts-dialog';

const SHIPPING_CHANNEL_OPTIONS = ['Semua Jasa Kirim', 'SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'];
const STATUS_ORDER = ['Terproses', 'Siap Kirim', 'Selesai', 'Diantar', 'Return Selesai', 'Return', 'Dibatalkan', 'Tidak Sampai'];
const CORE_STATUSES = ['Terproses', 'Siap Kirim', 'Selesai', 'Return', 'Dibatalkan', 'Return Selesai'];


function parseDateFromParams(dateArray: string[] | undefined): Date | null {
    if (dateArray && dateArray.length > 0) {
      if (dateArray[0] === 'semua') return null;
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
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
    'Terproses': Package,
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
        getPendingReceiptsBeforeDate,
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
    const [pendingOldReceiptsCount, setPendingOldReceiptsCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [printedReceiptCounts, setPrintedReceiptCounts] = useState<PrintedReceiptCount[]>([]);
    const [countsLoading, setCountsLoading] = useState(true);
    const [shippingChannel, setShippingChannel] = useState<string | null>(null);

    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);
    
    const fetchAllCounts = useCallback(async () => {
        setCountsLoading(true);
        const dateString = currentDate ? format(currentDate, 'yyyy-MM-dd') : undefined;
        try {
            const [statusData, printedData] = await Promise.all([
                fetchShippingReceiptCounts({ 
                    dateString: dateString,
                    shippingChannel: shippingChannel || undefined
                }),
                dateString ? getPrintedReceiptCountsForDate(dateString) : Promise.resolve([])
            ]);

            setStatusCounts(statusData.statuses);
            setPrintedReceiptCounts(printedData);
        } catch (error) {
             toast({ variant: 'destructive', title: "Gagal memuat jumlah status" });
        } finally {
            setCountsLoading(false);
        }
    }, [currentDate, shippingChannel, fetchShippingReceiptCounts, getPrintedReceiptCountsForDate, toast]);

    const checkOldPendingReceipts = useCallback(async () => {
        if (!currentDate) return;
        try {
            const count = await getPendingReceiptsBeforeDate(currentDate);
            setPendingOldReceiptsCount(count);
        } catch (error) {
            // fail silently
        }
    }, [currentDate, getPendingReceiptsBeforeDate]);

    useEffect(() => {
        checkOldPendingReceipts();
        fetchAllCounts();
    }, [checkOldPendingReceipts, fetchAllCounts]);

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = format(selectedDate, 'MM-dd-yyyy');
            router.push(`/shipping/receipt/${formattedDate}`);
        } else {
            router.push('/shipping/receipt/semua');
        }
    };
    
    const handleAddPrintedReceipts = async (salesChannel: string, shippingChannel: string, count: number) => {
        if (!currentDate) return;
        const dateString = format(currentDate, 'yyyy-MM-dd');
        await addPrintedReceipts(dateString, salesChannel, shippingChannel, count);
        await fetchAllCounts();
        toast({ title: 'Berhasil', description: `${count} resi tercetak telah ditambahkan.` });
    };
    
    const handleShowAllPending = () => {
        router.push('/shipping/receipt/semua');
        setSelectedStatus('Terproses'); 
    };

    const orderedStatuses = useMemo(() => {
        return STATUS_ORDER.filter(status => {
            return CORE_STATUSES.includes(status) || (statusCounts[status] > 0);
        });
    }, [statusCounts]);

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
                                    {currentDate ? format(currentDate, 'PPP') : <span>{t.shipping.receiptPage.selectDate}</span>}
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
                    {pendingOldReceiptsCount > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Pekerjaan Tertunda</AlertTitle>
                            <AlertDescription className="flex justify-between items-center">
                                Anda memiliki {pendingOldReceiptsCount} resi dari hari sebelumnya yang belum diproses.
                                 <Button variant="secondary" size="sm" onClick={handleShowAllPending}>Lihat & Proses Sekarang</Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {orderedStatuses.map(status => {
                             const Icon = statusIcons[status] || Package;
                             const count = statusCounts[status] || 0;
                             return (
                                <Card
                                    key={status}
                                    className={cn("hover:bg-accent hover:border-primary transition-colors", count > 0 && "cursor-pointer")}
                                    onClick={() => count > 0 && setSelectedStatus(status)}
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-5 w-5 text-muted-foreground"/>
                                                <h3 className="text-sm font-semibold">{status}</h3>
                                            </div>
                                            {countsLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{count}</div>}
                                        </div>
                                    </CardHeader>
                                </Card>
                            )
                         })}
                    </div>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Ringkasan Resi Tercetak</CardTitle>
                            <CardDescription>Jumlah resi yang telah Anda input untuk dicetak hari ini.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kanal Penjualan</TableHead>
                                        <TableHead>Jasa Kirim</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {countsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">Memuat data...</TableCell>
                                        </TableRow>
                                    ) : printedReceiptCounts.length > 0 ? (
                                        printedReceiptCounts.map(item => (
                                            <TableRow key={`${item.salesChannel}-${item.shippingChannel}`}>
                                                <TableCell>{item.salesChannel}</TableCell>
                                                <TableCell>{item.shippingChannel}</TableCell>
                                                <TableCell className="text-right font-medium">{item.count}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                Belum ada data resi tercetak untuk hari ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

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

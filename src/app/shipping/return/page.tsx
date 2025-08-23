
'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale, ShippingReceipt, ShippingStatus, InventoryItem, InventoryItemVariant } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Search, Undo2, ArchiveRestore, ScanLine, Check, Hourglass, XCircle, Truck, CheckCircle } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ReturnProcessingDialog } from './return-processing-dialog';

export default function ReturnPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { shippingReceipts, updateShippingReceiptStatus, addShippingReceipt, loading } = useInventory();
  const [receiptToVerify, setReceiptToVerify] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ShippingReceipt | null>(null);
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });

  const returnedReceipts = useMemo(() => {
    return shippingReceipts
      .filter(r => r.status === 'returned' || r.status === 'reconciled')
      .filter(r => {
        if (!dateRange || !dateRange.from) return true;
        const scannedDate = new Date(r.scannedAt);
        const toDate = dateRange.to || dateRange.from;
        return isWithinInterval(scannedDate, { start: startOfDay(dateRange.from), end: endOfDay(toDate) });
      });
  }, [shippingReceipts, dateRange]);

  const handleVerifyReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptToVerify.trim()) return;

    const receiptNumber = receiptToVerify.trim().toUpperCase();
    const existingReceipt = shippingReceipts.find(r => r.receiptNumber === receiptNumber);

    if (existingReceipt) {
        if (existingReceipt.status === 'returned') {
            try {
                await updateShippingReceiptStatus(existingReceipt.id, 'reconciled');
                toast({
                    title: "Resi Berhasil Diverifikasi",
                    description: `Resi ${existingReceipt.receiptNumber} telah ditandai telah sampai di gudang.`,
                });
            } catch (error) {
                toast({ variant: 'destructive', title: "Gagal Update", description: "Gagal memperbarui status resi." });
            }
        } else if (existingReceipt.status === 'reconciled') {
            toast({
                variant: 'default',
                title: "Resi Sudah Diproses",
                description: `Resi ${receiptToVerify} sudah ditandai selesai (reconciled).`
            });
        }
        else {
            toast({
                variant: 'destructive',
                title: "Status Resi Tidak Sesuai",
                description: `Resi ${receiptToVerify} tidak berstatus 'Return'. Status saat ini: ${TReceipt.statuses[existingReceipt.status]}`
            });
        }
    } else {
        try {
            await addShippingReceipt(receiptNumber, 'Lainnya');
            toast({
                title: "Resi Ditambahkan untuk Pemantauan",
                description: `Resi ${receiptNumber} telah ditambahkan dengan status Pending.`,
            });
        } catch(error) {
            const message = error instanceof Error ? error.message : "Gagal menambahkan resi baru.";
            toast({ variant: 'destructive', title: "Gagal Menambahkan Resi", description: message });
        }
    }
    setReceiptToVerify('');
  }
  
  const getStatusDisplay = (status: ShippingStatus) => {
    const displays: {[key in ShippingStatus]?: { variant: "default" | "secondary" | "destructive" | "outline" | null | undefined, icon: React.ElementType, text: string, className?: string }} = {
        pending: { variant: 'outline', icon: Hourglass, text: TReceipt.statuses.pending },
        returned: { variant: 'destructive', icon: Undo2, text: TReceipt.statuses.returned, className: 'bg-orange-500 hover:bg-orange-600' },
        reconciled: { variant: 'default', icon: CheckCircle, text: TReceipt.statuses.reconciled, className: 'bg-green-600 hover:bg-green-700' },
    };
    return displays[status];
  }


  return (
    <>
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{t.shipping.return}</h1>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Verifikasi & Pemantauan Barang Return</CardTitle>
                <CardDescription>Scan resi dari paket yang telah kembali atau yang akan kembali untuk verifikasi atau pemantauan.</CardDescription>
                <form onSubmit={handleVerifyReceipt} className="flex flex-col md:flex-row gap-2 pt-2">
                    <div className="relative flex-grow">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Scan atau masukkan nomor resi..."
                            value={receiptToVerify}
                            onChange={(e) => setReceiptToVerify(e.target.value)}
                            className="pl-10 h-10 text-base"
                        />
                    </div>
                     <Button type="submit">Verifikasi / Tambah Resi</Button>
                </form>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full md:w-[300px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pilih rentang tanggal</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="border rounded-md">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Tanggal Scan Awal</TableHead>
                                <TableHead>No. Resi</TableHead>
                                <TableHead>Jasa Kirim</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center w-[150px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Memuat data...</TableCell></TableRow>
                            ) : returnedReceipts.length > 0 ? (
                                returnedReceipts.map(receipt => {
                                    const display = getStatusDisplay(receipt.status);
                                    return (
                                        <TableRow key={receipt.id} className={cn(receipt.status === 'reconciled' && 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50')}>
                                            <TableCell>{format(new Date(receipt.scannedAt), 'd MMM yyyy')}</TableCell>
                                            <TableCell className="font-mono">{receipt.receiptNumber}</TableCell>
                                            <TableCell><Badge variant="secondary">{receipt.shippingService}</Badge></TableCell>
                                            <TableCell>
                                                {display && (
                                                     <Badge variant={display.variant} className={display.className}>
                                                        <display.icon className="mr-1 h-3 w-3" />
                                                        {display.text}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={receipt.status !== 'reconciled'}
                                                    onClick={() => {
                                                        setSelectedReceipt(receipt);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                    Proses Stok
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-48">
                                         <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <Undo2 className="h-16 w-16" />
                                            <p className="font-semibold">Tidak Ada Resi Return</p>
                                            <p className="text-sm">Tidak ada resi dengan status return pada rentang tanggal ini.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>
    </AppLayout>

    <ReturnProcessingDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        receipt={selectedReceipt}
    />
    </>
  );
}

    
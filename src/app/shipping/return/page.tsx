

'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale, ShippingReceipt, ShippingStatus } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Search, Undo2, ArchiveRestore, ScanLine, Check, Hourglass, XCircle, Truck, CheckCircle } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const returnItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantitySold: z.number(),
  returnQuantity: z.coerce.number().int().min(0, "Jumlah harus non-negatif."),
  reason: z.string().optional(),
}).refine(data => data.returnQuantity <= data.quantitySold, {
    message: "Jumlah return tidak bisa melebihi jumlah terjual.",
    path: ["returnQuantity"],
});

const returnFormSchema = z.object({
  transactionId: z.string(),
  items: z.array(returnItemSchema).min(1, "Harus ada setidaknya satu item untuk diretur."),
});


interface ReturnProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    transactionId: string;
    items: Sale[];
  } | null;
}

function ReturnProcessingDialog({ open, onOpenChange, transaction }: ReturnProcessingDialogProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const { updateStock } = useInventory();

    const form = useForm<z.infer<typeof returnFormSchema>>({
        resolver: zodResolver(returnFormSchema),
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "items"
    });

    React.useEffect(() => {
        if (transaction) {
            form.reset({
                transactionId: transaction.transactionId,
                items: transaction.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.productName + (item.variantName ? ` - ${item.variantName}` : ''),
                    sku: item.sku,
                    quantitySold: item.quantity,
                    returnQuantity: 0,
                    reason: `Return dari transaksi #${transaction.transactionId.slice(-6)}`,
                }))
            })
        }
    }, [transaction, form]);

    const onSubmit = async (values: z.infer<typeof returnFormSchema>) => {
        try {
            const updates = values.items
                .filter(item => item.returnQuantity > 0)
                .map(item => {
                    const idToUpdate = item.variantId || item.productId;
                    return updateStock(idToUpdate, item.returnQuantity, item.reason || 'Customer Return');
                });
            
            if(updates.length === 0) {
                toast({ variant: 'destructive', title: "Tidak ada item dipilih", description: "Masukkan jumlah item yang akan diretur." });
                return;
            }

            await Promise.all(updates);

            toast({
                title: "Return Berhasil Diproses",
                description: `${updates.length} jenis item telah dikembalikan ke stok.`,
            });
            onOpenChange(false);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Gagal Memproses Return",
                description: "Terjadi kesalahan saat mengembalikan stok.",
            });
        }
    };


    if (!transaction) return null;

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Proses Stok Masuk dari Return</DialogTitle>
                    <DialogDescription>
                        Masukkan jumlah barang yang dikembalikan ke stok.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Produk</TableHead>
                                    <TableHead>Terjual</TableHead>
                                    <TableHead>Diretur</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <p className="font-medium text-sm">{field.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {field.sku}</p>
                                        </TableCell>
                                        <TableCell>
                                            {field.quantitySold}
                                        </TableCell>
                                        <TableCell>
                                             <FormField
                                                control={form.control}
                                                name={`items.${index}.returnQuantity`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input type="number" {...formField} className="w-20 h-8" />
                                                        </FormControl>
                                                        <FormMessage className="text-xs"/>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                         <DialogFooter className="pt-6">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                            <Button type="submit">Proses Stok Masuk</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
         </Dialog>
    )

}

export default function ReturnPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { shippingReceipts, updateShippingReceiptStatus, loading } = useInventory();
  const [receiptToVerify, setReceiptToVerify] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{transactionId: string, items: Sale[]} | null>(null);
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

    const receipt = returnedReceipts.find(r => r.receiptNumber === receiptToVerify.trim().toUpperCase() && r.status === 'returned');
    
    if (receipt) {
        try {
            await updateShippingReceiptStatus(receipt.id, 'reconciled');
            toast({
                title: "Resi Berhasil Diverifikasi",
                description: `Resi ${receipt.receiptNumber} telah ditandai telah sampai.`,
            });
            setReceiptToVerify('');
        } catch (error) {
            toast({ variant: 'destructive', title: "Gagal Update", description: "Gagal memperbarui status resi." });
        }
    } else {
         toast({ variant: 'destructive', title: "Resi Tidak Ditemukan", description: `Resi ${receiptToVerify} tidak ditemukan di daftar return atau sudah diverifikasi.` });
    }
  }
  
  const getStatusDisplay = (status: ShippingStatus) => {
    const displays: {[key in ShippingStatus]?: { variant: "default" | "secondary" | "destructive" | "outline" | null | undefined, icon: React.ElementType, text: string, className?: string }} = {
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
                <CardTitle className="text-base">Verifikasi Barang Return</CardTitle>
                <CardDescription>Scan resi dari paket yang telah kembali ke toko untuk memverifikasi.</CardDescription>
                <form onSubmit={handleVerifyReceipt} className="flex flex-col md:flex-row gap-2 pt-2">
                    <div className="relative flex-grow">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Scan atau masukkan nomor resi return..."
                            value={receiptToVerify}
                            onChange={(e) => setReceiptToVerify(e.target.value)}
                            className="pl-10 h-10 text-base"
                        />
                    </div>
                     <Button type="submit">Verifikasi Resi</Button>
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
                                                    onClick={() => {/* Implement logic to find sale and open dialog */}}
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
        transaction={selectedTransaction}
    />
    </>
  );
}

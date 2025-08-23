
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { useScanSounds } from '@/hooks/use-scan-sounds';

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
  receipt: ShippingReceipt | null;
}

function ReturnProcessingDialog({ open, onOpenChange, receipt }: ReturnProcessingDialogProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const { updateStock, updateShippingReceiptStatus, getProductBySku } = useInventory();
    const { playSuccessSound, playErrorSound } = useScanSounds();

    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);

    useEffect(() => {
        if (!open) {
            setReturnItems([]);
            setSkuInput('');
        }
    }, [open]);

    const handleSkuSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!skuInput.trim()) return;

        try {
            const product = await getProductBySku(skuInput.trim());
            if (!product) {
                playErrorSound();
                toast({ variant: 'destructive', title: "Produk tidak ditemukan" });
                return;
            }

            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else {
                const itemToAdd = (product.variants && product.variants.length === 1) ? product.variants[0] : product;
                addItemToReturnList(product, itemToAdd as InventoryItemVariant);
            }
        } catch (error) {
            playErrorSound();
            toast({ variant: 'destructive', title: "Error", description: "Gagal mencari produk." });
        } finally {
            setSkuInput('');
        }
    };
    
    const addItemToReturnList = (parentProduct: InventoryItem, item: InventoryItemVariant) => {
        playSuccessSound();
        const existingItemIndex = returnItems.findIndex(ri => ri.id === item.id);
        if (existingItemIndex > -1) {
            const updatedItems = [...returnItems];
            updatedItems[existingItemIndex].returnQuantity += 1;
            setReturnItems(updatedItems);
        } else {
            setReturnItems(prev => [...prev, {
                id: item.id,
                productId: parentProduct.id,
                variantId: (item as any).productId ? item.id : undefined,
                name: (item as any).productId ? `${parentProduct.name} - ${item.name}`: parentProduct.name,
                sku: item.sku,
                imageUrl: parentProduct.imageUrl,
                returnQuantity: 1,
            }]);
        }
    };

    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addItemToReturnList(productForVariantSelection, variant);
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        const qty = Math.max(0, newQuantity);
        setReturnItems(items => items.map(item => item.id === itemId ? { ...item, returnQuantity: qty } : item).filter(item => item.returnQuantity > 0));
    };

    const handleFinalizeReturn = async () => {
        if (!receipt || returnItems.length === 0) return;
        setIsSubmitting(true);
        try {
            const stockUpdates = returnItems.map(item => 
                updateStock(item.id, item.returnQuantity, `Return dari resi #${receipt.receiptNumber}`)
            );
            await Promise.all(stockUpdates);
            await updateShippingReceiptStatus(receipt.id, 'reconciled');
            
            toast({
                title: "Return Berhasil Diproses",
                description: `${returnItems.length} jenis item telah dikembalikan ke stok.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Memproses Return",
                description: "Terjadi kesalahan saat mengembalikan stok.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!receipt) return null;

    return (
        <>
         <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setProductForVariantSelection(null); onOpenChange(isOpen);}}>
            <DialogContentPrimitive className="max-w-3xl">
                <DialogHeaderPrimitive>
                    <DialogTitle>Proses Barang Return (Resi: {receipt.receiptNumber})</DialogTitle>
                    <DialogDescription>
                        Scan SKU produk yang ada di dalam paket retur untuk menambahkannya ke daftar.
                    </DialogDescription>
                </DialogHeaderPrimitive>
                <form onSubmit={handleSkuSubmit} className="pt-4">
                    <Input
                        placeholder="Scan atau masukkan SKU..."
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        autoFocus
                    />
                </form>
                <div className="mt-4 border rounded-md max-h-80 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Produk</TableHead>
                                <TableHead className="text-center">Jumlah Diretur</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnItems.length > 0 ? returnItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.returnQuantity} 
                                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                                            className="w-20 mx-auto text-center"
                                        />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Scan produk untuk memulai...</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter className="pt-6">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleFinalizeReturn} disabled={isSubmitting || returnItems.length === 0}>
                        {isSubmitting ? 'Memproses...' : 'Tandai Selesai & Stok Masuk'}
                    </Button>
                </DialogFooter>
            </DialogContentPrimitive>
         </Dialog>
         {productForVariantSelection && (
             <VariantSelectionDialog
                open={!!productForVariantSelection}
                onOpenChange={() => setProductForVariantSelection(null)}
                item={productForVariantSelection}
                onSelect={handleVariantSelect}
                cart={[]}
                ignoreStockCheck={true}
            />
         )}
        </>
    )
}

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
        } else {
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

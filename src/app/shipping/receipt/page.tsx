
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Calendar as CalendarIcon, ScanLine, Truck, Trash2, CheckCircle, XCircle, Undo2, Hourglass, FileDown } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ShippingStatus, Sale } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogTitle as DialogTitlePrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogHeader as DialogHeaderPrimitive,
  DialogContent as DialogContentPrimitive,
  DialogFooter as DialogFooterPrimitive,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const SHIPPING_SERVICES = ['SPX', 'J&T', 'JNE', 'INSTANT'];


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
  receiptId: z.string(),
  items: z.array(returnItemSchema).min(1, "Harus ada setidaknya satu item untuk diretur."),
});

interface ReturnProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ShippingReceipt | null;
  salesForReceipt: Sale[];
}

function ReturnProcessingDialog({ open, onOpenChange, receipt, salesForReceipt }: ReturnProcessingDialogProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const { updateStock, updateShippingReceiptStatus } = useInventory();

    const form = useForm<z.infer<typeof returnFormSchema>>({
        resolver: zodResolver(returnFormSchema),
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "items"
    });

    React.useEffect(() => {
        if (receipt && salesForReceipt) {
            form.reset({
                receiptId: receipt.id,
                items: salesForReceipt.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.productName + (item.variantName ? ` - ${item.variantName}` : ''),
                    sku: item.sku,
                    quantitySold: item.quantity,
                    returnQuantity: 0,
                    reason: `Return dari resi #${receipt.receiptNumber}`,
                }))
            })
        }
    }, [receipt, salesForReceipt, form]);

    const onSubmit = async (values: z.infer<typeof returnFormSchema>) => {
        try {
            const stockUpdates = values.items
                .filter(item => item.returnQuantity > 0)
                .map(item => {
                    const idToUpdate = item.variantId || item.productId;
                    return updateStock(idToUpdate, item.returnQuantity, item.reason || 'Customer Return');
                });
            
            if(stockUpdates.length === 0) {
                toast({ variant: 'destructive', title: "Tidak ada item dipilih", description: "Masukkan jumlah item yang akan diretur." });
                return;
            }

            await Promise.all(stockUpdates);
            await updateShippingReceiptStatus(values.receiptId, 'returned');


            toast({
                title: "Return Berhasil Diproses",
                description: `${stockUpdates.length} jenis item telah dikembalikan ke stok.`,
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


    if (!receipt) return null;

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContentPrimitive className="max-w-2xl">
                <DialogHeaderPrimitive>
                    <DialogTitlePrimitive>Proses Barang Return (Resi: {receipt.receiptNumber})</DialogTitlePrimitive>
                    <DialogDescriptionPrimitive>
                        Masukkan jumlah barang yang benar-benar kembali ke gudang. Stok akan otomatis ditambahkan.
                    </DialogDescriptionPrimitive>
                </DialogHeaderPrimitive>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Produk</TableHead>
                                    <TableHead>Terjual</TableHead>
                                    <TableHead>Jumlah Return</TableHead>
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
                         <DialogFooterPrimitive className="pt-6">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                            <Button type="submit">Proses & Kembalikan ke Stok</Button>
                        </DialogFooterPrimitive>
                    </form>
                </Form>
            </DialogContentPrimitive>
         </Dialog>
    )
}

export default function ReceiptPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { toast } = useToast();
  const { allSales, shippingReceipts, addShippingReceipt, deleteShippingReceipt, updateShippingReceiptStatus, loading } = useInventory();
  
  const [receiptNumber, setReceiptNumber] = useState('');
  const [shippingService, setShippingService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [receiptToReturn, setReceiptToReturn] = useState<ShippingReceipt | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSubmitting) {
        receiptInputRef.current?.focus();
    }
  }, [isSubmitting]);

  const salesByTransactionId = useMemo(() => {
    const map = new Map<string, Sale[]>();
    allSales.forEach(sale => {
        if(sale.transactionId) {
            if(!map.has(sale.transactionId)) {
                map.set(sale.transactionId, []);
            }
            map.get(sale.transactionId)!.push(sale);
        }
    });
    return map;
  }, [allSales]);

  const filteredReceipts = useMemo(() => {
    return shippingReceipts.filter(receipt => {
        const scannedDate = new Date(receipt.scannedAt);
        const inDate = date ? isSameDay(scannedDate, date) : true;
        const serviceMatch = !shippingService || receipt.shippingService === shippingService;
        return inDate && serviceMatch;
    });
  }, [shippingReceipts, date, shippingService]);
  
  const paginatedReceipts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReceipts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim() || !shippingService || isSubmitting) return;

    setIsSubmitting(true);
    try {
        const upperCaseReceipt = receiptNumber.trim().toUpperCase();
        await addShippingReceipt(upperCaseReceipt, shippingService);
        toast({
            title: TReceipt.receiptAddedToast,
            description: TReceipt.receiptAddedDesc.replace('{receiptNumber}', upperCaseReceipt),
        });
        setReceiptNumber('');
    } catch (error) {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
         toast({
            variant: 'destructive',
            title: TReceipt.receiptAddErrorToast,
            description: message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!receiptToDelete) return;
    try {
        await deleteShippingReceipt(receiptToDelete.id);
        toast({
            title: TReceipt.receiptDeletedToast,
            description: TReceipt.receiptDeletedDesc.replace('{receiptNumber}', receiptToDelete.receiptNumber),
        });
        setReceiptToDelete(null);
    } catch (error) {
         toast({
            variant: 'destructive',
            title: TReceipt.receiptDeleteErrorToast,
            description: 'Terjadi kesalahan saat menghapus resi.',
        });
    }
  };
  
  const handleStatusChange = async (receipt: ShippingReceipt, newStatus: ShippingStatus) => {
    if (newStatus === 'returned') {
        const sales = salesByTransactionId.get(receipt.receiptNumber);
        if (!sales || sales.length === 0) {
            toast({
                variant: 'destructive',
                title: "Transaksi Tidak Ditemukan",
                description: `Tidak ditemukan detail penjualan untuk resi ${receipt.receiptNumber}. Tidak bisa memproses return.`,
            });
            return;
        }
        setReceiptToReturn(receipt);
        setIsReturnDialogOpen(true);
    } else {
        try {
            await updateShippingReceiptStatus(receipt.id, newStatus);
            toast({
                title: TReceipt.statusUpdatedToast,
                description: TReceipt.statusUpdatedDesc.replace('{status}', TReceipt.statuses[newStatus]),
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: TReceipt.statusUpdateErrorToast,
                description: "Gagal memperbarui status resi.",
            });
        }
    }
  };
  
  const getStatusDisplay = (status: ShippingStatus) => {
    const displays = {
        pending: { variant: 'secondary' as const, icon: Hourglass, text: TReceipt.statuses.pending },
        shipped: { variant: 'default' as const, icon: Truck, text: TReceipt.statuses.shipped },
        delivered: { variant: 'default' as const, icon: CheckCircle, text: TReceipt.statuses.delivered, className: 'bg-green-600 hover:bg-green-700' },
        cancelled: { variant: 'destructive' as const, icon: XCircle, text: TReceipt.statuses.cancelled },
        returned: { variant: 'destructive' as const, icon: Undo2, text: TReceipt.statuses.returned, className: 'bg-orange-500 hover:bg-orange-600' },
    };
    return displays[status] || displays.pending;
  }

  const getAvailableStatusTransitions = (currentStatus: ShippingStatus): ShippingStatus[] => {
    switch (currentStatus) {
        case 'pending':
            return ['shipped', 'cancelled'];
        case 'shipped':
            return ['delivered', 'returned'];
        case 'delivered':
        case 'cancelled':
        case 'returned':
            return []; // Final states
        default:
            return [];
    }
  }


  return (
    <>
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{TReceipt.scanReceipt}</h1>
        </div>
        
        <Card>
            <CardHeader>
                 <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
                    <Select value={shippingService} onValueChange={setShippingService} required>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder={TReceipt.selectShippingService} />
                        </SelectTrigger>
                        <SelectContent>
                            {SHIPPING_SERVICES.map(service => (
                                <SelectItem key={service} value={service}>{service}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full md:w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                            onClick={() => {}}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? (
                                format(date, "d MMM yyyy")
                            ) : (
                            <span>{TReceipt.dateRange}</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                                setDate(newDate);
                            }}
                        />
                        </PopoverContent>
                    </Popover>
                    <div className="relative flex-grow">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={receiptInputRef}
                            placeholder={TReceipt.scanOrEnterReceipt}
                            value={receiptNumber}
                            onChange={(e) => setReceiptNumber(e.target.value)}
                            className="pl-10 h-10 text-base"
                            disabled={isSubmitting || !shippingService}
                            required
                        />
                    </div>
                </form>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">{TReceipt.scannedAt}</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2">
                                        {TReceipt.receiptNumber}
                                        <Badge variant="secondary">{filteredReceipts.length}</Badge>
                                    </div>
                                </TableHead>
                                <TableHead>{TReceipt.shippingService}</TableHead>
                                <TableHead>{TReceipt.status}</TableHead>
                                <TableHead className="text-center">{TReceipt.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                                ))
                            ) : paginatedReceipts.length > 0 ? (
                                paginatedReceipts.map(receipt => {
                                    const { variant, icon: Icon, text, className: statusClassName } = getStatusDisplay(receipt.status);
                                    const availableTransitions = getAvailableStatusTransitions(receipt.status);
                                    return (
                                        <TableRow key={receipt.id}>
                                            <TableCell>{format(new Date(receipt.scannedAt), 'd MMM yyyy')}</TableCell>
                                            <TableCell className="font-mono font-medium">{receipt.receiptNumber}</TableCell>
                                            <TableCell><Badge variant="outline">{receipt.shippingService}</Badge></TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild disabled={availableTransitions.length === 0}>
                                                        <Button variant={variant} size="sm" className={cn("capitalize w-32 justify-start", statusClassName, availableTransitions.length === 0 && 'cursor-not-allowed')}>
                                                            <Icon className="mr-2 h-4 w-4"/>
                                                            {text}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                     {availableTransitions.length > 0 && (
                                                        <DropdownMenuContent>
                                                            {availableTransitions.map(status => (
                                                                <DropdownMenuItem key={status} onSelect={() => handleStatusChange(receipt, status)}>
                                                                    {TReceipt.statuses[status]}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    )}
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setReceiptToDelete(receipt)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <Truck className="h-16 w-16" />
                                            <p className="font-semibold">{TReceipt.noReceipts}</p>
                                            <p className="text-sm">{TReceipt.startScanning}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
             {totalPages > 1 && (
                <div className="p-4 border-t">
                    <Pagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                </div>
            )}
        </Card>
        <AlertDialog open={!!receiptToDelete} onOpenChange={() => setReceiptToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{TReceipt.deleteConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                       {TReceipt.deleteConfirmDescription.replace('{receiptNumber}', receiptToDelete?.receiptNumber || '')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        {TReceipt.deleteConfirmAction}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </AppLayout>
    <ReturnProcessingDialog
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        receipt={receiptToReturn}
        salesForReceipt={salesByTransactionId.get(receiptToReturn?.receiptNumber || '') || []}
    />
    </>
  );
}


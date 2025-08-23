
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
import { Calendar as CalendarIcon, ScanLine, Truck, Trash2, CheckCircle, XCircle, Undo2, Hourglass, FileDown, ShoppingBag } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ShippingStatus, Sale, InventoryItem, InventoryItemVariant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogHeader as DialogHeaderPrimitive,
  DialogContent as DialogContentPrimitive,
  DialogFooter,
} from '@/components/ui/dialog';
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { useScanSounds } from '@/hooks/use-scan-sounds';


const SHIPPING_SERVICES = ['SPX', 'J&T', 'JNE', 'INSTANT'];


interface ReturnItem {
    id: string; // variantId or productId
    productId: string;
    variantId?: string;
    name: string;
    sku?: string;
    imageUrl?: string;
    returnQuantity: number;
}

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
            await updateShippingReceiptStatus(receipt.id, 'returned');
            
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
                        {isSubmitting ? 'Memproses...' : 'Tandai Retur & Stok Masuk'}
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


export default function ReceiptPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { toast } = useToast();
  const { shippingReceipts, addShippingReceipt, deleteShippingReceipt, updateShippingReceiptStatus, loading } = useInventory();
  
  const [receiptNumber, setReceiptNumber] = useState('');
  const [shippingService, setShippingService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const [receiptToReturn, setReceiptToReturn] = useState<ShippingReceipt | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  

  useEffect(() => {
    if (!isSubmitting) {
        receiptInputRef.current?.focus();
    }
  }, [isSubmitting]);

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
                 <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
                    <div className="relative flex-grow w-full">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={receiptInputRef}
                            placeholder={TReceipt.scanOrEnterReceipt}
                            value={receiptNumber}
                            onChange={(e) => setReceiptNumber(e.target.value)}
                            className="pl-10 h-10 text-base"
                            disabled={isSubmitting}
                            required
                        />
                    </div>
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
    />
    </>
  );
}

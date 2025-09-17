
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Undo2, Truck, CheckCircle, XCircle, Package, Trash2, Search, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, InventoryItem, InventoryItemVariant } from '@/types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'dikirim':
        case 'diantar': return 'secondary';
        case 'return':
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

type ReturnedItem = InventoryItemVariant & { quantity: number; parentName?: string };

const ReturnProductDialog = ({
    open,
    onOpenChange,
    onProcessReturn
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProcessReturn: (items: ReturnedItem[]) => Promise<void>;
}) => {
    const { getProductBySku } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [returnedItems, setReturnedItems] = useState<ReturnedItem[]>([]);
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const { toast } = useToast();
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            setReturnedItems([]);
            setIsSubmitting(false);
        } else {
             setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const addOrUpdateReturnedItem = (variant: InventoryItemVariant, parentName?: string) => {
        setReturnedItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === variant.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...variant, quantity: 1, parentName }];
        });
        playSuccessSound();
        setSearchTerm('');
    };
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;

        const product = await getProductBySku(searchTerm);
        if (product) {
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                addOrUpdateReturnedItem(product.variants[0], product.name);
            } else {
                 playErrorSound();
                 toast({ variant: "destructive", title: "Produk Tunggal", description: "Produk ini tidak memiliki varian untuk dipilih." });
            }
        } else {
            playErrorSound();
            toast({ variant: "destructive", title: "Produk Tidak Ditemukan" });
        }
        inputRef.current?.focus();
    };

    const handleVariantSelectFromDialog = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addOrUpdateReturnedItem(variant, productForVariantSelection.name);
        }
        setProductForVariantSelection(null);
        inputRef.current?.focus();
    }
    
    const updateQuantity = (id: string, newQuantity: number) => {
        setReturnedItems(prevItems => {
            if (newQuantity <= 0) {
                return prevItems.filter(item => item.id !== id);
            }
            return prevItems.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item));
        });
    };
    
    const removeItem = (id: string) => {
        setReturnedItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const handleFinalizeReturn = async () => {
        if (returnedItems.length === 0) return;
        setIsSubmitting(true);
        try {
            await onProcessReturn(returnedItems);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Proses Barang Return</DialogTitle>
                        <DialogDescription>Scan atau cari produk yang dikembalikan untuk dimasukkan kembali ke stok.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <form onSubmit={handleSearch}>
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={inputRef}
                                    placeholder="Masukkan SKU atau Nama Produk, lalu Enter..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                             </div>
                        </form>
                        
                         <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-64 border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produk</TableHead>
                                                <TableHead className="w-[120px] text-center">Jumlah</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {returnedItems.length > 0 ? returnedItems.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">{item.parentName} - {item.name}</p>
                                                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                         <div className="flex items-center justify-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                                className="w-20 h-8 text-center"
                                                            />
                                                         </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeItem(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                                        Belum ada produk ditambahkan.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                         </Card>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button onClick={handleFinalizeReturn} disabled={returnedItems.length === 0 || isSubmitting}>
                            {isSubmitting ? 'Memproses...' : 'Masukkan Barang ke Stok'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {productForVariantSelection && (
                 <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => !isOpen && setProductForVariantSelection(null)}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelectFromDialog}
                    cart={[]}
                    ignoreStockCheck={true}
                />
            )}
        </>
    );
};


export default function ReturnPage() {
    const [returns, setReturns] = useState<ShippingReceipt[]>([]);
    const [totalReturns, setTotalReturns] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { updateStock, fetchShippingReceipts, deleteShippingReceipt, updateShippingReceiptStatus } = useInventory();
    const { language } = useLanguage();
    const t = translations[language].shipping.returnPage;
    const tCommon = translations[language].common;
    
    const [selectedReceipt, setSelectedReceipt] = useState<ShippingReceipt | null>(null);
    const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
    const [isProductSelectionDialogOpen, setIsProductSelectionDialogOpen] = useState(false);
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [channelCounts, setChannelCounts] = useState<Record<string, number> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);


    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const date = new Date(selectedYear, selectedMonth);
            const firstDay = startOfMonth(date);
            const lastDay = endOfMonth(date);

            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                status: ['Return', 'Return Selesai', 'Dibatalkan', 'Diantar', 'Tidak Sampai'],
                channel: activeChannel ?? undefined,
                awb: searchTerm || undefined,
                date_range: { from: firstDay, to: lastDay }
            });
            setReturns(receipts);
            setTotalReturns(total);
        } catch (error) {
            console.error("Failed to fetch return receipts:", error);
            toast({ variant: 'destructive', title: t.fetchError });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, activeChannel, searchTerm, toast, t.fetchError, fetchShippingReceipts, selectedMonth, selectedYear]);
    
    const fetchCounts = useCallback(async () => {
        try {
            const allReturnReceipts = await fetchShippingReceipts({ page: 1, limit: 10000, status: ['Return', 'Return Selesai', 'Dibatalkan', 'Diantar', 'Tidak Sampai'] });
            const countsByChannel: Record<string, number> = {};
            allReturnReceipts.receipts.forEach(r => {
                countsByChannel[r.channel] = (countsByChannel[r.channel] || 0) + 1;
            });

            setChannelCounts(countsByChannel);
        } catch (error) {
             console.error("Failed to fetch channel counts:", error);
        }
    }, [fetchShippingReceipts]);


    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);
    
    const totalPages = Math.ceil(totalReturns / itemsPerPage);

    const handleChangeStatus = async (id: number, newStatus: string) => {
        try {
            await updateShippingReceiptStatus(id, newStatus);
            toast({ title: t.statusUpdateSuccess, description: t.statusUpdateSuccessDesc.replace('{status}', newStatus) });
            fetchReturns();
            fetchCounts();
        } catch (error) {
            console.error(`Failed to change status to ${newStatus}:`, error);
            toast({ variant: 'destructive', title: t.statusUpdateError });
        }
    };
    
    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: t.deleteSuccess, description: t.deleteSuccessDesc.replace('{awb}', receiptToDelete.awb) });
            setReceiptToDelete(null);
            fetchReturns();
            fetchCounts();
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            toast({ variant: 'destructive', title: t.deleteError });
        }
    };

    const handleReturnReceived = (receipt: ShippingReceipt) => {
        setSelectedReceipt(receipt);
        setIsProductSelectionDialogOpen(true);
    };
    
    const handleVariantReturned = async (returnedItems: ReturnedItem[]) => {
        if (!selectedReceipt) return;
        
        try {
            const stockUpdatePromises = returnedItems.map(item => 
                updateStock(item.id, item.quantity, `Return dari resi ${selectedReceipt.awb}`)
            );
            
            await Promise.all(stockUpdatePromises);
            await handleChangeStatus(selectedReceipt.id, 'Return Selesai');
            
            toast({ title: t.stockReturnedSuccess, description: `${returnedItems.length} jenis produk telah dikembalikan ke stok.` });
            fetchReturns();
            fetchCounts();
        } catch (error) {
            toast({ variant: 'destructive', title: t.stockReturnedError });
            throw error; // Re-throw to keep dialog open on failure
        }
    };
    
    const downloadExcel = useCallback(() => {
        const dataToExport = returns.map(item => ({
            'No. Resi': item.awb,
            'Tanggal': format(parseISO(item.date), 'dd MMM yyyy HH:mm'),
            'Kanal': item.channel,
            'Status': item.status
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Return');

        const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM-yyyy', { locale: localeId });
        XLSX.writeFile(workbook, `Laporan_Return_${monthName}.xlsx`);
    }, [returns, selectedMonth, selectedYear]);

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           {t.title}
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari No. Resi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-9 w-full md:w-48"
                            />
                        </div>
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {format(new Date(0, i), 'MMMM', { locale: localeId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue placeholder="Pilih Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={downloadExcel} variant="outline" size="sm">
                            <FileDown className="mr-2 h-4 w-4" />
                            Download Return
                        </Button>
                    </div>
                </div>
                 <div className="flex flex-col gap-2">
                     <div className="border-b">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            <Button 
                                variant={activeChannel === null ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveChannel(null)}
                                className="shrink-0"
                            >
                                Semua
                                {channelCounts && (
                                     <Badge variant={activeChannel === null ? 'default' : 'secondary'} className="ml-2">
                                        {Object.values(channelCounts).reduce((a,b) => a+b, 0)}
                                    </Badge>
                                )}
                            </Button>
                            {(['Shopee', 'Tiktok', 'Lazada', 'Instant'] as const).map(tab => (
                                <Button 
                                    key={tab}
                                    variant={activeChannel === tab ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveChannel(tab)}
                                    className="shrink-0"
                                >
                                    {tab}
                                    {channelCounts && (
                                         <Badge variant={activeChannel === tab ? 'default' : 'secondary'} className="ml-2">
                                            {channelCounts[tab] || 0}
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="grid gap-6">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.table.awb}</TableHead>
                                        <TableHead>{t.table.date}</TableHead>
                                        <TableHead>{t.table.channel}</TableHead>
                                        <TableHead>{t.table.status}</TableHead>
                                        <TableHead className="text-center">{t.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="h-48 text-center">{t.loading}</TableCell></TableRow>
                                    ) : returns.length > 0 ? returns.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <Undo2 className="mr-2 h-3 w-3" />
                                                            {t.actions.process}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleReturnReceived(item)} disabled={item.status === 'Return Selesai'}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                            <span>{t.actions.itemArrived}</span>
                                                        </DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Diantar')} disabled={item.status === 'Diantar' || item.status === 'Return Selesai'}>
                                                            <Truck className="mr-2 h-4 w-4" />
                                                            <span>{t.actions.itemInTransit}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Tidak Sampai')} className="text-destructive" disabled={item.status === 'Return Selesai'}>
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            <span>{t.actions.itemNotArrived}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                     <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>{t.actions.delete}</span>
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t.deleteConfirmDesc.replace('{awb}', item.awb)}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>{tCommon.cancel}</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete()} className="bg-destructive hover:bg-destructive/90">
                                                                        {t.deleteConfirmAction}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Package className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noReturnsTitle}</p>
                                                    <p className="text-sm">{t.noReturnsDesc}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end p-4 border-t">
                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            </main>
            <ReturnProductDialog
                open={isProductSelectionDialogOpen}
                onOpenChange={setIsProductSelectionDialogOpen}
                onProcessReturn={handleVariantReturned}
            />
        </AppLayout>
    );
}

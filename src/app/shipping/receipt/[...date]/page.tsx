

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileDown, Trash2, Truck, ScanLine, Search, Send, Ban, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { fetchShippingReceipts, deleteShippingReceipt, updateShippingReceiptsStatus, updateShippingReceiptStatus, fetchShippingReceiptCountsByChannel } from '@/lib/inventory-service';
import type { ShippingReceipt } from '@/types';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Link from 'next/link';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecordSaleForReceiptDialog } from '@/app/components/record-sale-for-receipt-dialog';


type ShippingProvider = 'SPX' | 'J&T' | 'JNE' | 'INSTANT' | 'CARGO';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'dikirim': return 'secondary';
        case 'return':
        case 'dibatalkan': return 'destructive';
        default: return 'outline';
    }
};

function parseDateFromParams(dateArray: string[] | undefined): Date {
    if (dateArray && dateArray.length > 0) {
      // Assuming the format is MM-dd-yyyy
      const [month, day, year] = dateArray[0].split('-');
      const parsedDate = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
}


export default function ReceiptPage() {
    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language].shipping.receiptPage;
    const tCommon = translations[language].common;
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const [activeShippingTab, setActiveShippingTab] = useState<string | null>(null);
    const [activeSalesChannelTab, setActiveSalesChannelTab] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [channelCounts, setChannelCounts] = useState<Record<string, number> | null>(null);

    const [receiptForSale, setReceiptForSale] = useState<ShippingReceipt | null>(null);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);


    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);
    
    useEffect(() => {
        const shippingChannel = searchParams.get('channel');
        setActiveShippingTab(shippingChannel);
    }, [searchParams]);

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            const searchOptions: any = {
                page: currentPage,
                limit: itemsPerPage,
                awb: searchTerm || undefined,
                dateString: searchTerm ? undefined : dateString,
                salesChannel: activeSalesChannelTab || undefined,
                channel: activeShippingTab || undefined,
            };

            const { receipts, total } = await fetchShippingReceipts(searchOptions);
            setReceipts(receipts);
            setTotalReceipts(total);
        } catch (error) {
            console.error("Failed to fetch receipts:", error);
            toast({ variant: 'destructive', title: t.fetchError });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, activeShippingTab, activeSalesChannelTab, currentDate, searchTerm, toast, t.fetchError]);
    
    const fetchCounts = useCallback(async () => {
        try {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            const counts = await fetchShippingReceiptCountsByChannel(dateString);
            setChannelCounts(counts);
        } catch (error) {
             console.error("Failed to fetch channel counts:", error);
        }
    }, [currentDate]);


    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    useEffect(() => {
        fetchCounts();
    }, [currentDate, fetchReceipts, fetchCounts]);
    
    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeShippingTab, activeSalesChannelTab, currentDate, searchTerm, currentPage]);

    const handleDelete = async (receiptToDelete: ShippingReceipt) => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: t.deleteSuccess, description: t.deleteSuccessDesc.replace('{awb}', receiptToDelete.awb) });
            fetchReceipts(); // Refresh data
            fetchCounts();
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            toast({ variant: 'destructive', title: t.deleteError });
        }
    };
    
    const handleChangeStatus = async (id: number, newStatus: string) => {
        try {
            await updateShippingReceiptStatus(id, newStatus);
            toast({ title: t.statusUpdateSuccess, description: t.statusUpdateSuccessDesc.replace('{status}', newStatus) });
            fetchReceipts();
            fetchCounts();
        } catch (error) {
            console.error(`Failed to change status to ${newStatus}:`, error);
            toast({ variant: 'destructive', title: t.statusUpdateError, description: t.statusUpdateErrorDesc });
        }
    };

    const handleProcessShipment = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        try {
            await updateShippingReceiptsStatus(Array.from(selectedIds), 'Dikirim');
            toast({ title: t.bulkProcessSuccess, description: t.bulkProcessSuccessDesc.replace('{count}', selectedIds.size.toString()) });
            setSelectedIds(new Set());
            fetchReceipts();
            fetchCounts();
        } catch (error) {
            console.error("Failed to process shipments:", error);
            toast({ variant: 'destructive', title: t.bulkProcessError, description: t.bulkProcessErrorDesc });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = format(selectedDate, 'MM-dd-yyyy');
            const currentChannel = searchParams.get('channel');
            const newPath = currentChannel ? `/shipping/receipt/${formattedDate}?channel=${currentChannel}` : `/shipping/receipt/${formattedDate}`;
            router.push(newPath);
            setDatePickerOpen(false);
            setCurrentPage(1); // Reset to first page
        }
    };
    
    const handleShippingTabChange = (tab: string | null) => {
        setActiveShippingTab(tab);
        setCurrentPage(1);
    };

    const handleSalesChannelTabChange = (tab: string | null) => {
        setActiveSalesChannelTab(tab);
        setCurrentPage(1);
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const processableIds = receipts.filter(r => r.status === 'Perlu Diproses').map(r => r.id);
            setSelectedIds(new Set(processableIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: number, isChecked: boolean) => {
        const newSelectedIds = new Set(selectedIds);
        if (isChecked) {
            newSelectedIds.add(id);
        } else {
            newSelectedIds.delete(id);
        }
        setSelectedIds(newSelectedIds);
    };
    
    const handleRecordSale = (receipt: ShippingReceipt) => {
        setReceiptForSale(receipt);
        setIsSaleDialogOpen(true);
    };

    const totalPages = Math.ceil(totalReceipts / itemsPerPage);
    const isAllSelected = receipts.length > 0 && receipts.filter(r => r.status === 'Perlu Diproses').every(r => selectedIds.has(r.id));
    const finalStatuses = ['Selesai', 'Return', 'Dibatalkan'];

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
                                placeholder={t.searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-9 w-64"
                            />
                         </div>
                         <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
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
                                {currentDate ? format(currentDate, 'PPP') : <span>{t.selectDate}</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                         <Button size="sm" asChild>
                             <Link href="/mobile">
                                <ScanLine className="mr-2 h-4 w-4" />
                                Scan Resi
                             </Link>
                         </Button>
                         {selectedIds.size > 0 && (
                            <Button size="sm" onClick={handleProcessShipment} disabled={isProcessing}>
                                <Send className="mr-2 h-4 w-4" />
                                {isProcessing ? t.processing : `${t.processSelected} (${selectedIds.size})`}
                            </Button>
                         )}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                     <div className="border-b">
                         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                             <Button 
                                key="all-sales"
                                variant={activeSalesChannelTab === null ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleSalesChannelTabChange(null)}
                                className="shrink-0"
                            >
                                Semua Kanal
                            </Button>
                            {(['Shopee', 'Tiktok', 'Lazada'] as const).map(tab => (
                                <Button 
                                    key={tab}
                                    variant={activeSalesChannelTab === tab ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleSalesChannelTabChange(tab)}
                                    className="shrink-0"
                                >
                                    {tab}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                         <Button 
                            key="all-shipping"
                            variant={activeShippingTab === null ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => handleShippingTabChange(null)}
                            className="shrink-0"
                        >
                            Semua Jasa Kirim
                        </Button>
                        {(['SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'] as ShippingProvider[]).map(tab => (
                            <Button 
                                key={tab}
                                variant={activeShippingTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleShippingTabChange(tab)}
                                className="shrink-0"
                            >
                                {tab}
                                {channelCounts && (
                                    <Badge variant={activeShippingTab === tab ? 'default' : 'secondary'} className="ml-2">
                                        {channelCounts[tab] || 0}
                                    </Badge>
                                )}
                            </Button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                             <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label={t.selectAll}
                                                disabled={receipts.filter(r => r.status === 'Perlu Diproses').length === 0}
                                            />
                                        </TableHead>
                                        <TableHead>{t.table.awb}</TableHead>
                                        <TableHead>Kanal Penjualan</TableHead>
                                        <TableHead>Jasa Kirim</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">{t.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="h-48 text-center">{t.loading}</TableCell></TableRow>
                                    ) : receipts.length > 0 ? receipts.map(item => (
                                        <TableRow key={item.id} data-state={selectedIds.has(item.id) && 'selected'}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                                                    aria-label={`${t.select} ${item.awb}`}
                                                    disabled={item.status !== 'Perlu Diproses'}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{item.salesChannel}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                         {item.status === 'Perlu Diproses' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleRecordSale(item)}>Catat Penjualan</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Dikirim')}>{t.actions.processShipment}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Dibatalkan')} className="text-destructive">{t.actions.cancel}</DropdownMenuItem>
                                                            </>
                                                         )}
                                                         {item.status === 'Dikirim' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Selesai')}>{t.actions.markAsDone}</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Return')} className="text-destructive">{t.actions.markAsReturn}</DropdownMenuItem>
                                                            </>
                                                         )}
                                                         <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                    Hapus
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
                                                                    <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive hover:bg-destructive/90">
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
                                            <TableCell colSpan={6} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Truck className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noReceiptsTitle}</p>
                                                    <p className="text-sm">{t.noReceiptsDesc}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end p-4 border-t">
                                 <div className="flex items-center gap-4">
                                    <Pagination
                                        totalPages={totalPages}
                                        currentPage={currentPage}
                                        onPageChange={setCurrentPage}
                                    />
                                    <Select
                                        value={`${itemsPerPage}`}
                                        onValueChange={(value) => {
                                            setItemsPerPage(Number(value))
                                            setCurrentPage(1)
                                        }}
                                        >
                                        <SelectTrigger className="h-8 w-[200px]">
                                            <SelectValue placeholder={itemsPerPage} />
                                        </SelectTrigger>
                                        <SelectContent side="top">
                                            {[25, 50, 100].map((pageSize) => (
                                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                                {`${pageSize} / halaman`}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </main>
            <RecordSaleForReceiptDialog
                open={isSaleDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsSaleDialogOpen(isOpen);
                    if (!isOpen) {
                        setReceiptForSale(null);
                        fetchReceipts();
                        fetchCounts();
                    }
                }}
                receipt={receiptForSale}
            />
        </AppLayout>
    );
}




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
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useRouter } from 'next/navigation';


type ShippingProvider = 'Shopee' | 'Tiktok' | 'Lazada' | 'Instant';

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
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
    const [activeTab, setActiveTab] = useState<ShippingProvider>('Shopee');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { language } = useLanguage();
    const t = translations[language].shipping.receiptPage;
    const tCommon = translations[language].common;
    const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [channelCounts, setChannelCounts] = useState<Record<string, number> | null>(null);
    const router = useRouter();
    const params = useParams();

    const currentDate = useMemo(() => parseDateFromParams(Array.isArray(params.date) ? params.date : undefined), [params.date]);


    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const dateString = format(currentDate, 'yyyy-MM-dd');
            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                channel: activeTab,
                dateString: dateString,
                awb: searchTerm,
            });
            setReceipts(receipts);
            setTotalReceipts(total);
        } catch (error) {
            console.error("Failed to fetch receipts:", error);
            toast({ variant: 'destructive', title: t.fetchError });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, activeTab, currentDate, searchTerm, toast, t.fetchError]);
    
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
    }, [currentDate, fetchCounts]);
    
    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab, currentDate, searchTerm, currentPage]);

    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: t.deleteSuccess, description: t.deleteSuccessDesc.replace('{awb}', receiptToDelete.awb) });
            setReceiptToDelete(null);
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
            router.push(`/shipping/receipt/${formattedDate}`);
            setDatePickerOpen(false);
            setCurrentPage(1); // Reset to first page
        }
    };

    const handleTabChange = (tab: ShippingProvider) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset to first page
    };

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
    
    const totalPages = Math.ceil(totalReceipts / itemsPerPage);
    const isAllSelected = receipts.length > 0 && receipts.filter(r => r.status === 'Perlu Diproses').every(r => selectedIds.has(r.id));

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
                         <Button size="sm" onClick={handleProcessShipment} disabled={selectedIds.size === 0 || isProcessing}>
                            <Send className="mr-2 h-4 w-4" />
                            {isProcessing ? t.processing : `${t.processSelected} (${selectedIds.size})`}
                         </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                        {(['Shopee', 'Tiktok', 'Lazada', 'Instant'] as ShippingProvider[]).map(tab => (
                            <Button 
                                key={tab}
                                variant={activeTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => handleTabChange(tab)}
                                className="shrink-0"
                            >
                                {tab}
                                {channelCounts && (
                                    <Badge variant={activeTab === tab ? 'default' : 'secondary'} className="ml-2">
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
                                        <TableHead>{t.table.date}</TableHead>
                                        <TableHead>{t.table.channel}</TableHead>
                                        <TableHead>{t.table.status}</TableHead>
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
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy HH:mm')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className={cn(
                                                            "px-2 py-1 h-auto text-xs",
                                                            getStatusVariant(item.status) === 'default' && "bg-primary text-primary-foreground hover:bg-primary/90",
                                                            getStatusVariant(item.status) === 'secondary' && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                                                            getStatusVariant(item.status) === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                                                        )}>
                                                            {item.status}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                         {item.status === 'Perlu Diproses' && (
                                                            <>
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
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); setReceiptToDelete(item); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                         </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t.deleteConfirmDesc.replace('{awb}', receiptToDelete?.awb || '')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={() => setReceiptToDelete(null)}>{tCommon.cancel}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                                {t.deleteConfirmAction}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
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
        </AppLayout>
    );
}

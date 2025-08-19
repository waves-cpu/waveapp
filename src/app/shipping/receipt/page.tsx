

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
import { Calendar as CalendarIcon, ScanLine, Truck, Trash2 } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { addShippingReceipt, fetchShippingReceipts, deleteShippingReceipt } from '@/lib/inventory-service';
import type { ShippingReceipt } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SHIPPING_SERVICES = ['SPX', 'J&T', 'JNE', 'INSTANT'];

export default function ReceiptPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { toast } = useToast();
  
  const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [shippingService, setShippingService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfDay(new Date()), to: new Date() });
  const [shippingServiceFilter, setShippingServiceFilter] = useState('all');

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchShippingReceipts();
      setReceipts(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: TReceipt.receiptFetchErrorToast,
        description: TReceipt.receiptFetchErrorDesc,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, TReceipt]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);
  
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
        const scannedDate = new Date(receipt.scannedAt);
        const inDateRange = dateRange?.from ? isWithinInterval(scannedDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) }) : true;
        const serviceMatch = shippingServiceFilter === 'all' || receipt.shippingService === shippingServiceFilter;
        return inDateRange && serviceMatch;
    });
  }, [receipts, dateRange, shippingServiceFilter]);


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
        loadReceipts();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
         toast({
            variant: 'destructive',
            title: TReceipt.receiptAddErrorToast,
            description: message,
        });
    } finally {
        setIsSubmitting(false);
        receiptInputRef.current?.focus();
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
        loadReceipts();
    } catch (error) {
         toast({
            variant: 'destructive',
            title: TReceipt.receiptDeleteErrorToast,
            description: 'Terjadi kesalahan saat menghapus resi.',
        });
    }
  };
  
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'pending': return 'secondary';
        case 'shipped': return 'default';
        case 'delivered': return 'default';
        case 'returned': return 'destructive';
        default: return 'outline';
    }
  }


  return (
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{TReceipt.scanReceipt}</h1>
        </div>
        
        <Card>
            <CardHeader>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
                    <Select value={shippingService} onValueChange={setShippingService}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder={TReceipt.selectShippingService} />
                        </SelectTrigger>
                        <SelectContent>
                            {SHIPPING_SERVICES.map(service => (
                                <SelectItem key={service} value={service}>{service}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative flex-grow">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={receiptInputRef}
                            placeholder={TReceipt.scanOrEnterReceipt}
                            value={receiptNumber}
                            onChange={(e) => setReceiptNumber(e.target.value)}
                            className="pl-10 h-10 text-base"
                            disabled={isSubmitting}
                        />
                    </div>
                     <Button type="submit" disabled={isSubmitting || !receiptNumber.trim() || !shippingService}>
                        {isSubmitting ? TReceipt.adding : TReceipt.addReceipt}
                    </Button>
                </form>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center py-4 border-t">
                    <h3 className="font-semibold text-sm">{TReceipt.scannedReceipts}</h3>
                    <div className="flex gap-2">
                        <Select value={shippingServiceFilter} onValueChange={setShippingServiceFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={TReceipt.shippingService} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{TReceipt.allShippingServices}</SelectItem>
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
                                "w-[260px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>{format(dateRange.from, "d MMM yyyy")} - {format(dateRange.to, "d MMM yyyy")}</>
                                ) : (
                                    format(dateRange.from, "d MMM yyyy")
                                )
                                ) : (
                                <span>{TReceipt.dateRange}</span>
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
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">{TReceipt.scannedAt}</TableHead>
                                <TableHead>{TReceipt.receiptNumber}</TableHead>
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
                            ) : filteredReceipts.length > 0 ? (
                                filteredReceipts.map(receipt => (
                                    <TableRow key={receipt.id}>
                                        <TableCell>{format(new Date(receipt.scannedAt), 'd MMM yyyy, HH:mm')}</TableCell>
                                        <TableCell className="font-mono font-medium">{receipt.receiptNumber}</TableCell>
                                        <TableCell><Badge variant="outline">{receipt.shippingService}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(receipt.status)} className="capitalize">{receipt.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setReceiptToDelete(receipt)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
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
  );
}

    
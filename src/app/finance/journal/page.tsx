
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, FileText, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { id as localeId } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import type { ManualJournalEntry, Sale } from "@/types";
import { AddManualJournalDialog } from "@/app/components/add-manual-journal-dialog";
import { Pagination } from "@/components/ui/pagination";
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
import { useToast } from "@/hooks/use-toast";


type JournalEntry = {
    id?: string;
    transactionId?: string; // For sales
    date: Date;
    description: string;
    account: string;
    debit?: number;
    credit?: number;
    type: 'sale' | 'stock_in' | 'capital_adjustment' | 'manual';
};

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    if (amount === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function GeneralJournalSkeleton() {
     return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                     <div className="flex flex-col md:flex-row gap-2">
                        <Skeleton className="h-9 w-full md:w-40" />
                        <Skeleton className="h-9 w-full md:w-60" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
     )
}


export default function GeneralJournalPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { allSales, items: allProducts, manualJournalEntries, loading, deleteManualJournalEntry, cancelSaleTransaction, cancelSale } = useInventory();
    const { toast } = useToast();
    const [isAddEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);


    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    });
    const [transactionType, setTransactionType] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(16);
    const [currentPage, setCurrentPage] = useState(1);


    const journalEntries = useMemo((): JournalEntry[] => {
        const entries: JournalEntry[] = [];

        // Manual entries
        manualJournalEntries.forEach(entry => {
            const entryDate = parseISO(entry.date);
            entries.push({ id: entry.id, date: entryDate, description: entry.description, account: entry.debitAccount, debit: entry.amount, type: 'manual'});
            entries.push({ id: entry.id, date: entryDate, description: entry.description, account: entry.creditAccount, credit: entry.amount, type: 'manual'});
        });


        // Sales entries
        allSales.forEach(sale => {
            const saleDate = parseISO(sale.saleDate);
            const revenue = sale.priceAtSale * sale.quantity;
            const cogs = (sale.cogsAtSale || 0) * sale.quantity;
            const description = `Penjualan ${sale.productName} (${sale.quantity}x) - ${sale.channel}`;
            
            const saleEntryBase = { id: sale.id, transactionId: sale.transactionId, date: saleDate, description, type: 'sale' as const };

            entries.push({ ...saleEntryBase, account: 'Piutang Usaha / Kas', debit: revenue });
            entries.push({ ...saleEntryBase, account: 'Pendapatan Penjualan', credit: revenue });

            if (cogs > 0) {
                entries.push({ ...saleEntryBase, account: 'Beban Pokok Penjualan', debit: cogs });
                entries.push({ ...saleEntryBase, account: 'Persediaan Barang', credit: cogs });
            }
        });

        const processHistories = (histories: any[] | undefined, name: string, costPrice?: number) => {
            if(!histories) return;
            histories.forEach(h => {
               const adjustmentDate = new Date(h.date);
               
               if (h.change === 0 && h.reason.startsWith('Penyesuaian Modal (HPP)')) {
                   const value = h.newStockLevel; 
                   const description = `Penyesuaian Modal Persediaan: ${name}`;
                   entries.push({ id: h.id, date: adjustmentDate, description, account: 'Persediaan Barang', debit: value, type: 'capital_adjustment' });
                   entries.push({ id: h.id, date: adjustmentDate, description, account: 'Penyesuaian Modal (Persediaan)', credit: value, type: 'capital_adjustment' });

               } else if (h.change > 0 && h.reason.toLowerCase() === 'stock in') {
                    const value = h.change * (costPrice || 0);
                    if (value > 0) {
                       const formattedCostPrice = formatCurrency(costPrice);
                       const description = `Stok Masuk: ${name} (Tambah ${h.change} @ ${formattedCostPrice})`;
                       entries.push({ id: h.id, date: adjustmentDate, description, account: 'Persediaan Barang', debit: value, type: 'stock_in'});
                       entries.push({ id: h.id, date: adjustmentDate, description, account: 'Kas / Utang Usaha', credit: value, type: 'stock_in'});
                    }
               }
           });
        }

        allProducts.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(v => processHistories(v.history, `${product.name} - ${v.name}`, v.costPrice))
            } else {
                 processHistories(product.history, product.name, product.costPrice)
            }
        });
        
        return entries.sort((a,b) => b.date.getTime() - a.date.getTime());
    }, [allSales, allProducts, manualJournalEntries]);

    const filteredEntries = useMemo(() => {
        const filtered = journalEntries.filter(entry => {
            const isInDateRange = dateRange?.from ? isWithinInterval(entry.date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) }) : true;
            const isTypeMatch = transactionType === 'all' || entry.type === transactionType;
            return isInDateRange && isTypeMatch;
        });
        setCurrentPage(1);
        return filtered;
    }, [journalEntries, dateRange, transactionType]);
    
    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEntries, currentPage, itemsPerPage]);

    const pageTotals = useMemo(() => {
        return paginatedEntries.reduce((acc, entry) => {
            acc.debit += entry.debit || 0;
            acc.credit += entry.credit || 0;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [paginatedEntries]);

    const handleDelete = async () => {
        if (!entryToDelete || !entryToDelete.id) return;
        try {
             if (entryToDelete.type === 'manual') {
                await deleteManualJournalEntry(entryToDelete.id);
                toast({ title: "Entri Dihapus", description: "Entri jurnal manual telah berhasil dihapus." });
            } else if (entryToDelete.type === 'sale') {
                if (entryToDelete.transactionId) {
                    await cancelSaleTransaction(entryToDelete.transactionId);
                } else {
                    await cancelSale(entryToDelete.id);
                }
                toast({ title: "Penjualan Dibatalkan", description: "Transaksi penjualan telah dibatalkan dan stok dikembalikan." });
            } else {
                 toast({ variant: 'destructive', title: "Aksi Tidak Diizinkan", description: "Jenis entri ini tidak dapat dihapus dari sini." });
            }
            setEntryToDelete(null);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Menghapus",
                description: `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    };

    const getDeleteDialogDescription = () => {
        if (!entryToDelete) return "";
        if (entryToDelete.type === 'manual') {
            return `Anda yakin ingin menghapus entri jurnal untuk "${entryToDelete.description}"? Tindakan ini tidak dapat diurungkan.`;
        }
        if (entryToDelete.type === 'sale') {
            return `Anda yakin ingin membatalkan transaksi "${entryToDelete.description}"? Stok akan dikembalikan. Tindakan ini tidak dapat diurungkan.`;
        }
        return `Anda yakin ingin menghapus entri ini? Tindakan ini mungkin memiliki konsekuensi yang tidak terduga.`;
    }


    if (loading) {
        return (
             <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.generalJournal}</h1>
                    </div>
                    <GeneralJournalSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.generalJournal}</h1>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Select value={transactionType} onValueChange={setTransactionType}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Jenis Transaksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Transaksi</SelectItem>
                                <SelectItem value="sale">Penjualan</SelectItem>
                                <SelectItem value="stock_in">Stok Masuk</SelectItem>
                                <SelectItem value="capital_adjustment">Penyesuaian Modal</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                        </Select>
                            <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[260px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>{format(dateRange.from, "d MMM yyyy", {locale: localeId})} - {format(dateRange.to, "d MMM yyyy", {locale: localeId})}</>
                                ) : (
                                    format(dateRange.from, "d MMM yyyy", {locale: localeId})
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
                                locale={localeId}
                            />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" onClick={() => setAddEntryDialogOpen(true)} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tambah Entri
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px] text-xs">Tanggal</TableHead>
                                        <TableHead className="w-[35%] text-xs">Keterangan</TableHead>
                                        <TableHead className="text-xs">Akun</TableHead>
                                        <TableHead className="text-right text-xs">Debit</TableHead>
                                        <TableHead className="text-right text-xs">Kredit</TableHead>
                                        <TableHead className="w-[50px] text-center text-xs">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedEntries.length > 0 ? (
                                        paginatedEntries.map((entry, index) => (
                                            <TableRow key={index} className={cn(entry.credit && "text-muted-foreground")}>
                                                <TableCell className="text-xs">{format(entry.date, 'd MMM yyyy')}</TableCell>
                                                <TableCell className="text-xs">{entry.description}</TableCell>
                                                <TableCell className={cn("text-xs", entry.credit && "pl-8")}>{entry.account}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{formatCurrency(entry.debit)}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{formatCurrency(entry.credit)}</TableCell>
                                                <TableCell className="text-center">
                                                    {entry.debit && (entry.type === 'manual' || entry.type === 'sale') && (
                                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEntryToDelete(entry)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                                 <div className="flex flex-col items-center justify-center gap-4">
                                                    <FileText className="h-12 w-12" />
                                                    <p className="font-semibold text-sm">Tidak Ada Jurnal</p>
                                                    <p className="text-xs">Tidak ada transaksi yang tercatat pada rentang tanggal yang dipilih.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted hover:bg-muted">
                                        <TableCell colSpan={3} className="text-right font-semibold text-xs">Total Halaman Ini</TableCell>
                                        <TableCell className="text-right font-semibold text-xs font-mono">{formatCurrency(pageTotals.debit)}</TableCell>
                                        <TableCell className="text-right font-semibold text-xs font-mono">{formatCurrency(pageTotals.credit)}</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                    {totalPages > 1 && (
                        <CardFooter>
                            <div className="flex w-full items-center justify-end pt-4 border-t">
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
                                            {[16, 20, 50, 100].map((pageSize) => (
                                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                                {`${pageSize} / ${t.productSelectionDialog.page}`}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </main>
            <AddManualJournalDialog open={isAddEntryDialogOpen} onOpenChange={setAddEntryDialogOpen} />

            <AlertDialog open={!!entryToDelete} onOpenChange={(isOpen) => !isOpen && setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Entri Jurnal?</AlertDialogTitle>
                        <AlertDialogDescription>
                           {getDeleteDialogDescription()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );

}


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
import { Calendar as CalendarIcon, FileText, PlusCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { id as localeId } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import type { ManualJournalEntry } from "@/types";
import { AddManualJournalDialog } from "@/app/components/add-manual-journal-dialog";
import { Pagination } from "@/components/ui/pagination";

type JournalEntry = {
    date: Date;
    description: string;
    account: string;
    debit?: number;
    credit?: number;
    type: 'sale' | 'stock_in' | 'capital_adjustment' | 'manual';
};

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
    const { allSales, items: allProducts, manualJournalEntries, loading } = useInventory();
    const [isAddEntryDialogOpen, setAddEntryDialogOpen] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      to: new Date(),
    });
    const [transactionType, setTransactionType] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);


    const journalEntries = useMemo((): JournalEntry[] => {
        const entries: JournalEntry[] = [];

        // Manual entries
        manualJournalEntries.forEach(entry => {
            const entryDate = new Date(entry.date);
            entries.push({ date: entryDate, description: entry.description, account: entry.debitAccount, debit: entry.amount, type: 'manual'});
            entries.push({ date: entryDate, description: entry.description, account: entry.creditAccount, credit: entry.amount, type: 'manual'});
        });


        // Sales entries
        allSales.forEach(sale => {
            const saleDate = new Date(sale.saleDate);
            const revenue = sale.priceAtSale * sale.quantity;
            const cogs = (sale.cogsAtSale || 0) * sale.quantity;
            const description = `Penjualan ${sale.productName} (${sale.quantity}x) - ${sale.channel}`;
            
            entries.push({ date: saleDate, description, account: 'Piutang Usaha / Kas', debit: revenue, type: 'sale' });
            entries.push({ date: saleDate, description, account: 'Pendapatan Penjualan', credit: revenue, type: 'sale' });

            if (cogs > 0) {
                entries.push({ date: saleDate, description, account: 'Beban Pokok Penjualan', debit: cogs, type: 'sale' });
                entries.push({ date: saleDate, description, account: 'Persediaan Barang', credit: cogs, type: 'sale' });
            }
        });

        const processHistories = (histories: any[] | undefined, name: string, costPrice?: number) => {
            if(!histories) return;
            histories.forEach(h => {
               const adjustmentDate = new Date(h.date);
               
               if (h.change === 0 && h.reason.startsWith('Penyesuaian Modal (HPP)')) {
                   const value = h.newStockLevel; 
                   const description = `Penyesuaian Modal Persediaan: ${name}`;
                   entries.push({ date: adjustmentDate, description, account: 'Persediaan Barang', debit: value, type: 'capital_adjustment' });
                   entries.push({ date: adjustmentDate, description, account: 'Penyesuaian Modal (Persediaan)', credit: value, type: 'capital_adjustment' });

               } else if (h.change > 0 && h.reason.toLowerCase().includes('stock in')) {
                    const value = h.change * (costPrice || 0);
                    if (value > 0) {
                       const description = `Stok Masuk: ${name} (${h.change}x)`;
                       entries.push({ date: adjustmentDate, description, account: 'Persediaan Barang', debit: value, type: 'stock_in'});
                       entries.push({ date: adjustmentDate, description, account: 'Kas / Utang Usaha', credit: value, type: 'stock_in'});
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
            const entryDate = new Date(entry.date);
            const isInDateRange = dateRange?.from ? isWithinInterval(entryDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to || dateRange.from) }) : true;
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

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return '-';
        if (amount === 0) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
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
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.generalJournal}</h1>
                    </div>
                    <Button variant="outline" onClick={() => setAddEntryDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Entri
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                             <div className="space-y-1">
                                <CardTitle className="text-base">Jurnal Umum</CardTitle>
                                <CardDescription className="text-xs">Catatan kronologis semua transaksi keuangan.</CardDescription>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2">
                                <Select value={transactionType} onValueChange={setTransactionType}>
                                    <SelectTrigger className="w-full md:w-[180px]">
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
                                        "w-full md:w-[260px] justify-start text-left font-normal",
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
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px] text-xs">Tanggal</TableHead>
                                        <TableHead className="w-[35%] text-xs">Keterangan</TableHead>
                                        <TableHead className="text-xs">Akun</TableHead>
                                        <TableHead className="text-right text-xs">Debit</TableHead>
                                        <TableHead className="text-right text-xs">Kredit</TableHead>
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
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
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
                                            {[15, 20, 50, 100].map((pageSize) => (
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
        </AppLayout>
    );

    

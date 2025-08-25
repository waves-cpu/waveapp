
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import type { ManualJournalEntry, Sale } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chartOfAccounts } from "@/types";
import { Button } from "@/components/ui/button";
import { id as localeId } from 'date-fns/locale';
import { BookText } from "lucide-react";

type JournalEntry = {
    date: Date;
    description: string;
    debit?: number;
    credit?: number;
};

type LedgerAccount = {
    accountName: string;
    entries: JournalEntry[];
    totalDebit: number;
    totalCredit: number;
    balance: number;
};

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

function GeneralLedgerSkeleton() {
    return (
        <Card>
            
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function GeneralLedgerPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { allSales, items: allProducts, manualJournalEntries, loading } = useInventory();
    const [selectedAccount, setSelectedAccount] = useState<string>(chartOfAccounts[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const years = useMemo(() => {
        const allYears = new Set(allSales.map(s => parseISO(s.saleDate).getFullYear()));
        if (allYears.size === 0) allYears.add(new Date().getFullYear());
        return Array.from(allYears).sort((a,b) => b-a);
    }, [allSales]);

    const ledgers = useMemo((): Map<string, LedgerAccount> => {
        const ledgerMap = new Map<string, LedgerAccount>();
        const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        const endDate = endOfMonth(new Date(selectedYear, selectedMonth));

        const isInDateRange = (date: Date) => {
            return isWithinInterval(date, { start: startDate, end: endDate });
        };

        const addEntry = (accountName: string, entry: JournalEntry) => {
            if (!isInDateRange(entry.date)) return;
            if (!ledgerMap.has(accountName)) {
                ledgerMap.set(accountName, {
                    accountName,
                    entries: [],
                    totalDebit: 0,
                    totalCredit: 0,
                    balance: 0,
                });
            }
            const account = ledgerMap.get(accountName)!;
            account.entries.push(entry);
        };
        
        // Manual entries
        manualJournalEntries.forEach(entry => {
            const entryDate = parseISO(entry.date);
            addEntry(entry.debitAccount, { date: entryDate, description: entry.description, debit: entry.amount });
            addEntry(entry.creditAccount, { date: entryDate, description: entry.description, credit: entry.amount });
        });
        
        // Sales entries
        allSales.forEach(sale => {
            const saleDate = parseISO(sale.saleDate);
            const revenue = sale.priceAtSale * sale.quantity;
            const cogs = (sale.cogsAtSale || 0) * sale.quantity;
            const description = `Penjualan ${sale.productName} (${sale.quantity}x) - ${sale.channel}`;

            addEntry('Piutang Usaha / Kas', { date: saleDate, description, debit: revenue });
            addEntry('Pendapatan Penjualan', { date: saleDate, description, credit: revenue });

            if (cogs > 0) {
                addEntry('Beban Pokok Penjualan', { date: saleDate, description, debit: cogs });
                addEntry('Persediaan Barang', { date: saleDate, description, credit: cogs });
            }
        });

        // Stock In / Capital Adjustment entries
        const processHistories = (histories: any[] | undefined, name: string, costPrice?: number) => {
            if(!histories) return;
            histories.forEach(h => {
               const adjustmentDate = new Date(h.date);
               if (h.change === 0 && h.reason.startsWith('Penyesuaian Modal (HPP)')) {
                   const value = h.newStockLevel; 
                   const description = `Penyesuaian Modal Persediaan: ${name}`;
                   addEntry('Persediaan Barang', { date: adjustmentDate, description, debit: value });
                   addEntry('Penyesuaian Modal (Persediaan)', { date: adjustmentDate, description, credit: value });
               } else if (h.change > 0 && h.reason.toLowerCase() === 'stock in') {
                    const value = h.change * (costPrice || 0);
                    if (value > 0) {
                       const formattedCostPrice = formatCurrency(costPrice);
                       const description = `Stok Masuk: ${name} (Tambah ${h.change} @ ${formattedCostPrice})`;
                       addEntry('Persediaan Barang', { date: adjustmentDate, description, debit: value });
                       addEntry('Kas / Utang Usaha', { date: adjustmentDate, description, credit: value });
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

        // Calculate totals and balance
        for (const account of ledgerMap.values()) {
            account.entries.sort((a, b) => a.date.getTime() - b.date.getTime());
            let currentBalance = 0;
            const isDebitNormal = !['pendapatan', 'modal', 'utang', 'kewajiban', 'akumulasi'].some(term => account.accountName.toLowerCase().includes(term));
            
            account.entries.forEach(entry => {
                const debit = entry.debit || 0;
                const credit = entry.credit || 0;
                account.totalDebit += debit;
                account.totalCredit += credit;
                if (isDebitNormal) {
                    currentBalance += debit - credit;
                } else {
                    currentBalance += credit - debit;
                }
            });
             account.balance = currentBalance;
        }

        return ledgerMap;
    }, [allSales, allProducts, manualJournalEntries, selectedMonth, selectedYear]);

    const displayedLedger = useMemo(() => {
        return ledgers.get(selectedAccount);
    }, [ledgers, selectedAccount]);

    if (loading) {
        return (
             <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.generalLedger}</h1>
                    </div>
                    <GeneralLedgerSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                     <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <div className="space-y-1">
                            <h1 className="text-lg font-bold">{t.finance.generalLedger}</h1>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-full md:w-[180px]">
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
                            <SelectTrigger className="w-full md:w-[120px]">
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
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger className="w-full md:w-[300px]">
                                <SelectValue placeholder="Pilih Akun" />
                            </SelectTrigger>
                            <SelectContent>
                                {chartOfAccounts.map(acc => (
                                    <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="flex flex-col flex-grow">
                    <CardContent className="flex-grow p-0">
                         <div className="border-t h-full">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead className="w-[120px] text-xs">Tanggal</TableHead>
                                            <TableHead className="w-[45%] text-xs">Keterangan</TableHead>
                                            <TableHead className="text-right text-xs">Debit</TableHead>
                                            <TableHead className="text-right text-xs">Kredit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedLedger && displayedLedger.entries.length > 0 ? (
                                            displayedLedger.entries.map((entry, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="text-xs">{format(entry.date, 'd MMM yyyy')}</TableCell>
                                                    <TableCell className="text-xs">{entry.description}</TableCell>
                                                    <TableCell className="text-right text-xs font-mono">{formatCurrency(entry.debit)}</TableCell>
                                                    <TableCell className="text-right text-xs font-mono">{formatCurrency(entry.credit)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                        <BookText className="h-12 w-12" />
                                                        <div className="text-center">
                                                            <p className="font-semibold text-sm">Tidak Ada Entri</p>
                                                            <p className="text-xs">Tidak ada transaksi untuk akun ini pada periode yang dipilih.</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    {displayedLedger && displayedLedger.entries.length > 0 && (
                                        <TableFooter className="sticky bottom-0 bg-card">
                                            <TableRow className="bg-muted hover:bg-muted font-semibold">
                                                <TableCell colSpan={2} className="text-right text-xs">Total</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{formatCurrency(displayedLedger.totalDebit)}</TableCell>
                                                <TableCell className="text-right text-xs font-mono">{formatCurrency(displayedLedger.totalCredit)}</TableCell>
                                            </TableRow>
                                            <TableRow className="bg-secondary hover:bg-secondary font-bold">
                                                <TableCell colSpan={3} className="text-right text-sm">Saldo Akhir</TableCell>
                                                <TableCell className="text-right text-sm font-mono">{formatCurrency(displayedLedger.balance)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    )}
                                </Table>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

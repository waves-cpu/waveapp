
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { useInventory } from "@/hooks/use-inventory";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as localeId } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

const formatCurrency = (amount: number, withSign = false) => {
    const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));

    if (amount < 0) {
        return `(${formatted.replace('Rp', '')})`;
    }
    if (withSign && amount > 0) {
        return `+${formatted}`;
    }
    return formatted;
}

function ProfitLossSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader></Card>
            </div>
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-2/3"><Skeleton className="h-5 w-32" /></TableHead>
                                    <TableHead className="text-right"><Skeleton className="h-5 w-24" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function ProfitLossPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { allSales, manualJournalEntries, loading } = useInventory();
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const years = useMemo(() => {
        const allYears = new Set(allSales.map(s => parseISO(s.saleDate).getFullYear()));
        if (allYears.size === 0) allYears.add(new Date().getFullYear());
        return Array.from(allYears).sort((a,b) => b-a);
    }, [allSales]);

    const financialData = useMemo(() => {
        const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
        const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
        
        const isInDateRange = (dateString: string) => {
            const date = parseISO(dateString);
            return isWithinInterval(date, { start: startDate, end: endDate });
        };

        const salesInDateRange = allSales.filter(sale => isInDateRange(sale.saleDate));
        const manualEntriesInDateRange = manualJournalEntries.filter(entry => isInDateRange(entry.date));

        const totalRevenue = salesInDateRange.reduce((sum, sale) => sum + (sale.priceAtSale * sale.quantity), 0);
        const totalCogs = salesInDateRange.reduce((sum, sale) => sum + ((sale.cogsAtSale || 0) * sale.quantity), 0);
        const grossProfit = totalRevenue - totalCogs;

        const operationalExpenses = manualEntriesInDateRange
            .filter(entry => entry.debitAccount.toLowerCase().includes('biaya') || entry.debitAccount.toLowerCase().includes('beban'))
            .reduce((sum, entry) => sum + entry.amount, 0);

        const otherIncome = manualEntriesInDateRange
            .filter(entry => entry.creditAccount.toLowerCase().includes('pendapatan'))
            .reduce((sum, entry) => sum + entry.amount, 0);


        const netProfit = grossProfit + otherIncome - operationalExpenses;

        return {
            totalRevenue,
            totalCogs,
            grossProfit,
            operationalExpenses,
            netProfit,
            otherIncome
        };

    }, [allSales, manualJournalEntries, selectedMonth, selectedYear]);


    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.profitLossReport}</h1>
                    </div>
                    <ProfitLossSkeleton />
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
                        <h1 className="text-lg font-bold">{t.finance.profitLossReport}</h1>
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                </div>

                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.totalRevenue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.grossProfit)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Beban Operasional</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.operationalExpenses)}</div>
                             <p className="text-xs text-muted-foreground">Dari entri jurnal manual</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                            <Landmark className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className={cn(
                                "text-2xl font-bold",
                                financialData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                                {formatCurrency(financialData.netProfit)}
                            </div>
                        </CardContent>
                    </Card>
                </div>


                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Laporan Laba Rugi</CardTitle>
                        <CardDescription className="text-xs">
                            Ringkasan pendapatan dan pengeluaran untuk periode yang dipilih.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60%]">Deskripsi</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="font-semibold">
                                        <TableCell>Pendapatan</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="pl-8">Total Pendapatan Penjualan</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.totalRevenue)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="pl-8">Pendapatan Lain-lain</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.otherIncome)}</TableCell>
                                    </TableRow>
                                    <TableRow className="font-semibold bg-muted/50">
                                        <TableCell>Total Pendapatan</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.totalRevenue + financialData.otherIncome)}</TableCell>
                                    </TableRow>
                                    
                                    <TableRow className="font-semibold">
                                        <TableCell>Beban Pokok Penjualan</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="pl-8">Total HPP</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.totalCogs)}</TableCell>
                                    </TableRow>
                                     <TableRow className="font-semibold bg-muted/50">
                                        <TableCell>Total Beban Pokok Penjualan</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.totalCogs)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold text-base bg-secondary hover:bg-secondary">
                                        <TableCell>Laba Kotor</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.grossProfit)}</TableCell>
                                    </TableRow>
                                     <TableRow className="font-semibold">
                                        <TableCell>Beban Operasional</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(financialData.operationalExpenses)}</TableCell>
                                    </TableRow>
                                    <TableRow className="font-bold text-lg bg-primary/10 hover:bg-primary/20">
                                        <TableCell>Laba Bersih</TableCell>
                                        <TableCell className={cn(
                                            "text-right font-mono",
                                            financialData.netProfit >= 0 ? "text-green-700" : "text-red-700"
                                        )}>{formatCurrency(financialData.netProfit)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

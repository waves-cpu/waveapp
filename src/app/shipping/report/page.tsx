
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Truck, PackageCheck, Undo2, Ban, History } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"


type DailyCount = {
  date: string;
  'Perlu Diproses': number;
  Dikirim: number;
  Selesai: number;
  'Return Selesai': number;
  Dibatalkan: number;
  Return: number;
  Total: number;
};

const STATUS_KEYS = ['Perlu Diproses', 'Dikirim', 'Selesai', 'Return Selesai', 'Dibatalkan', 'Return'];

const chartConfig = {
  PerluDiproses: { label: "Perlu Diproses", color: "hsl(var(--chart-1))" },
  Dikirim: { label: "Dikirim", color: "hsl(var(--chart-2))" },
  Selesai: { label: "Selesai", color: "hsl(var(--chart-3))" },
  ReturnSelesai: { label: "Return Selesai", color: "hsl(var(--chart-4))" },
  Dibatalkan: { label: "Dibatalkan", color: "hsl(var(--chart-5))" },
  Return: { label: "Return", color: "hsl(var(--destructive))" },
} satisfies ChartConfig


export default function ReceiptReportPage() {
    const [reportData, setReportData] = useState<DailyCount[]>([]);
    const [totalCounts, setTotalCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const { fetchShippingReceipts } = useInventory();
    const { language } = useLanguage();
    const t = translations[language].shipping.reportPage;
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        // Show current year and last 5 years
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);

    const fetchReportData = useCallback(async () => {
        setLoading(true);
        try {
            const date = new Date(selectedYear, selectedMonth);
            const firstDay = startOfMonth(date);
            const lastDay = endOfMonth(date);

            const { receipts } = await fetchShippingReceipts({
                page: 1,
                limit: 10000, // Fetch all for the month
                date_range: { from: firstDay, to: lastDay }
            });

            const dailyData: { [key: string]: Omit<DailyCount, 'date'> } = {};

            const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
            daysInMonth.forEach(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                dailyData[dateKey] = {
                    'Perlu Diproses': 0, 'Dikirim': 0, 'Selesai': 0, 'Return Selesai': 0,
                    'Dibatalkan': 0, 'Return': 0, 'Total': 0
                };
            });
            
            const totals: Record<string, number> = {};
            STATUS_KEYS.forEach(key => totals[key] = 0);
            totals.Total = 0;

            receipts.forEach(receipt => {
                const dateKey = format(parseISO(receipt.date), 'yyyy-MM-dd');
                if (dailyData[dateKey]) {
                    dailyData[dateKey][receipt.status as keyof typeof dailyData[string]]++;
                    dailyData[dateKey].Total++;
                    
                    totals[receipt.status]++;
                    totals.Total++;
                }
            });

            const formattedData = Object.entries(dailyData).map(([date, counts]) => ({
                date: format(parseISO(date), 'd MMM'),
                ...counts
            }));

            setReportData(formattedData);
            setTotalCounts(totals);

        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setLoading(false);
        }
    }, [fetchShippingReceipts, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const downloadExcel = useCallback(() => {
        const dataToExport = reportData.map(item => ({
            'Tanggal': item.date,
            'Perlu Diproses': item['Perlu Diproses'],
            'Dikirim': item.Dikirim,
            'Selesai': item.Selesai,
            'Return Selesai': item['Return Selesai'],
            'Dibatalkan': item.Dibatalkan,
            'Return': item.Return,
            'Total': item.Total
        }));

        const totalsRow = {
            'Tanggal': 'TOTAL',
            'Perlu Diproses': totalCounts['Perlu Diproses'] || 0,
            'Dikirim': totalCounts.Dikirim || 0,
            'Selesai': totalCounts.Selesai || 0,
            'Return Selesai': totalCounts['Return Selesai'] || 0,
            'Dibatalkan': totalCounts.Dibatalkan || 0,
            'Return': totalCounts.Return || 0,
            'Total': totalCounts.Total || 0,
        };
        
        dataToExport.push(totalsRow);

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Resi');
        
        const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM-yyyy', { locale: localeId });
        XLSX.writeFile(workbook, `Laporan_Resi_${monthName}.xlsx`);
    }, [reportData, totalCounts, selectedMonth, selectedYear]);

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
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder={t.selectMonth} />
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
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder={t.selectYear} />
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
                            Download Laporan
                        </Button>
                    </div>
                </div>
                 <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Laporan Resi Bulanan</CardTitle>
                             <CardDescription>
                                Jumlah resi harian berdasarkan status untuk bulan {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: localeId })}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead className="w-[100px]">{t.table.date}</TableHead>
                                       <TableHead className="text-center">{t.table.pending}</TableHead>
                                       <TableHead className="text-center">{t.table.shipped}</TableHead>
                                       <TableHead className="text-center">{t.table.completed}</TableHead>
                                       <TableHead className="text-center">{t.table.returnCompleted}</TableHead>
                                       <TableHead className="text-center">{t.table.cancelled}</TableHead>
                                       <TableHead className="text-center">{t.table.returned}</TableHead>
                                       <TableHead className="text-center font-bold">{t.table.total}</TableHead>
                                   </TableRow>
                               </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={8} className="h-48 text-center">Memuat data...</TableCell></TableRow>
                                    ) : reportData.length > 0 ? reportData.map(item => (
                                        <TableRow key={item.date}>
                                            <TableCell className="font-medium">{item.date}</TableCell>
                                            <TableCell className="text-center">{item['Perlu Diproses']}</TableCell>
                                            <TableCell className="text-center">{item.Dikirim}</TableCell>
                                            <TableCell className="text-center">{item.Selesai}</TableCell>
                                            <TableCell className="text-center">{item['Return Selesai']}</TableCell>
                                            <TableCell className="text-center">{item.Dibatalkan}</TableCell>
                                            <TableCell className="text-center">{item.Return}</TableCell>
                                            <TableCell className="text-center font-bold">{item.Total}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <History className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noDataTitle}</p>
                                                    <p className="text-sm">{t.noDataDesc}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                 <CardFooter>
                                    <TableRow>
                                        <TableHead className="font-bold">TOTAL</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts['Perlu Diproses'] || 0}</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts.Dikirim || 0}</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts.Selesai || 0}</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts['Return Selesai'] || 0}</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts.Dibatalkan || 0}</TableHead>
                                        <TableHead className="text-center font-bold">{totalCounts.Return || 0}</TableHead>
                                        <TableHead className="text-center font-extrabold text-lg">{totalCounts.Total || 0}</TableHead>
                                    </TableRow>
                                </CardFooter>
                           </Table>
                        </CardContent>
                    </Card>
                 </div>
            </main>
        </AppLayout>
    )
}

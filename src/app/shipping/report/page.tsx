

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Truck, PackageCheck, Undo2, Ban, History, Loader2, BarChart3, List, AlertCircle } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt } from '@/types';
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import { formatToWIB } from '@/lib/utils';


type DailyCount = {
  date: string;
  'Terproses': number;
  'Siap Kirim': number;
  'Diantar': number;
  'Selesai': number;
  'Return Selesai': number;
  'Dibatalkan': number;
  'Return': number;
  'Tidak Sampai': number;
  'Total': number;
};

const STATUS_KEYS: (keyof Omit<DailyCount, 'date' | 'Total'>)[] = ['Terproses', 'Siap Kirim', 'Diantar', 'Selesai', 'Return Selesai', 'Dibatalkan', 'Return', 'Tidak Sampai'];

const chartConfig = {
  'Terproses': { label: "Terproses", color: "hsl(var(--chart-1))" },
  'Siap Kirim': { label: "Siap Kirim", color: "hsl(var(--chart-2))" },
  'Diantar': { label: "Diantar", color: "hsl(var(--chart-3))"},
  'Selesai': { label: "Selesai", color: "hsl(var(--chart-4))" },
  'Return Selesai': { label: "Return Selesai", color: "hsl(var(--chart-5))" },
  'Dibatalkan': { label: "Dibatalkan", color: "hsl(var(--destructive))" },
  'Return': { label: "Return", color: "hsl(var(--destructive))" },
  'Tidak Sampai': { label: "Tidak Sampai", color: "hsl(var(--destructive))" },
} satisfies ChartConfig


export default function ReceiptReportPage() {
    const [reportData, setReportData] = useState<DailyCount[]>([]);
    const [totalCounts, setTotalCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const { fetchShippingReceipts } = useInventory();
    const { language } = useLanguage();
    const { toast } = useToast();
    const t = translations[language].shipping.reportPage;
    
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
    const [isDownloading, setIsDownloading] = useState(false);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

    useEffect(() => {
        const currentDate = new Date();
        setSelectedMonth(currentDate.getMonth());
        setSelectedYear(currentDate.getFullYear());
    }, []);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        // Show current year and last 5 years
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);

    const fetchReportData = useCallback(async () => {
        if (selectedMonth === undefined || selectedYear === undefined) return;
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
                const dateKey = formatToWIB(day, 'yyyy-MM-dd');
                dailyData[dateKey] = {
                    'Terproses': 0, 'Siap Kirim': 0, 'Diantar': 0, 'Selesai': 0, 'Return Selesai': 0,
                    'Dibatalkan': 0, 'Return': 0, 'Tidak Sampai': 0, 'Total': 0
                };
            });
            
            const totals: Record<string, number> = {};
            [...STATUS_KEYS, 'Total'].forEach(key => totals[key] = 0);

            receipts.forEach(receipt => {
                const dateKey = formatToWIB(parseISO(receipt.date), 'yyyy-MM-dd');
                if (dailyData[dateKey] && receipt.status) {
                    const statusKey = receipt.status as keyof typeof dailyData[string];
                    if(statusKey in dailyData[dateKey]) {
                        dailyData[dateKey][statusKey]++;
                        dailyData[dateKey].Total++;
                        
                        totals[statusKey]++;
                        totals.Total++;
                    }
                }
            });

            const formattedData = Object.entries(dailyData).map(([date, counts]) => ({
                date: formatToWIB(parseISO(date), 'd MMM'),
                ...counts
            }));

            setReportData(formattedData);
            setTotalCounts(totals);

        } catch (error) {
             toast({ variant: 'destructive', title: t.fetchError });
        } finally {
            setLoading(false);
        }
    }, [fetchShippingReceipts, selectedMonth, selectedYear, toast, t.fetchError]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const downloadExcel = useCallback(() => {
        setIsDownloading(true);
        const { id, update } = toast({ title: 'Memulai unduhan', description: 'Laporan Excel sedang disiapkan...' });

        if (selectedMonth === undefined || selectedYear === undefined) {
            update({ id, title: 'Gagal', description: 'Bulan atau tahun tidak valid.', variant: 'destructive' });
            setIsDownloading(false);
            return;
        }

        setTimeout(() => {
            const dataToExport = reportData.map(item => ({
                'Tanggal': item.date,
                'Terproses': item['Terproses'],
                'Siap Kirim': item['Siap Kirim'],
                'Diantar': item.Diantar,
                'Selesai': item.Selesai,
                'Return Selesai': item['Return Selesai'],
                'Dibatalkan': item.Dibatalkan,
                'Return': item.Return,
                'Tidak Sampai': item['Tidak Sampai'],
                'Total': item.Total
            }));

            const totalsRow = {
                'Tanggal': 'TOTAL',
                'Terproses': totalCounts['Terproses'] || 0,
                'Siap Kirim': totalCounts['Siap Kirim'] || 0,
                'Diantar': totalCounts.Diantar || 0,
                'Selesai': totalCounts.Selesai || 0,
                'Return Selesai': totalCounts['Return Selesai'] || 0,
                'Dibatalkan': totalCounts.Dibatalkan || 0,
                'Return': totalCounts.Return || 0,
                'Tidak Sampai': totalCounts['Tidak Sampai'] || 0,
                'Total': totalCounts.Total || 0,
            };
            
            dataToExport.push(totalsRow);

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Resi');
            
            const monthName = formatToWIB(new Date(selectedYear, selectedMonth), 'MMMM-yyyy', { locale: localeId });
            const fileName = `Laporan_Resi_${monthName}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            update({
                id,
                title: "Unduhan Siap",
                description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
            });
            setIsDownloading(false);
        }, 500);
    }, [reportData, totalCounts, selectedMonth, selectedYear, toast]);

    const statusCards = [
        { key: 'Terproses', icon: Truck, color: 'text-yellow-600' },
        { key: 'Siap Kirim', icon: Truck, color: 'text-blue-600' },
        { key: 'Diantar', icon: Truck, color: 'text-sky-600' },
        { key: 'Selesai', icon: PackageCheck, color: 'text-green-600' },
        { key: 'Return Selesai', icon: History, color: 'text-purple-600' },
        { key: 'Return', icon: Undo2, color: 'text-orange-600' },
        { key: 'Dibatalkan', icon: Ban, color: 'text-red-600' },
        { key: 'Tidak Sampai', icon: AlertCircle, color: 'text-red-800' },
    ];

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
                        {selectedMonth !== undefined && (
                        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder={t.selectMonth} />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {formatToWIB(new Date(0, i), 'MMMM', { locale: localeId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        )}
                        {selectedYear !== undefined && (
                        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                            <SelectTrigger className="w-[100px] h-9">
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
                        )}
                        <Button onClick={downloadExcel} variant="outline" size="sm" disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            {isDownloading ? 'Mengekspor...' : 'Download Laporan'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {statusCards.map(card => {
                        const Icon = card.icon;
                        const count = totalCounts[card.key] || 0;
                        return (
                            <Card key={card.key}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{card.key}</CardTitle>
                                    <Icon className={`h-4 w-4 ${card.color}`} />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin" /> : count}</div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Grafik Resi Harian</CardTitle>
                                <CardDescription>Visualisasi jumlah resi per hari berdasarkan status.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                                <Button variant={viewMode === 'chart' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('chart')}>
                                    <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('table')}>
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="h-[400px] flex items-center justify-center text-muted-foreground">Memuat data grafik...</div>
                        ) : viewMode === 'chart' ? (
                            <ChartContainer config={chartConfig} className="h-[400px] w-full">
                                <BarChart data={reportData} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                {STATUS_KEYS.map(key => (
                                    <Bar key={key} dataKey={key} stackId="a" fill={`var(--color-${key.replace(/ /g, '')})`} radius={0} />
                                ))}
                                </BarChart>
                            </ChartContainer>
                        ) : (
                           <div className="max-h-[400px] overflow-auto">
                               <Table>
                                   <TableHeader className="sticky top-0 bg-background">
                                       <TableRow>
                                           <TableHead className="w-[100px]">{t.table.date}</TableHead>
                                           {STATUS_KEYS.map(key => <TableHead key={key} className="text-center">{key}</TableHead>)}
                                           <TableHead className="text-center font-bold">{t.table.total}</TableHead>
                                       </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                        {reportData.map(item => (
                                            <TableRow key={item.date}>
                                                <TableCell className="font-medium">{item.date}</TableCell>
                                                {STATUS_KEYS.map(key => <TableCell key={key} className="text-center">{item[key]}</TableCell>)}
                                                <TableCell className="text-center font-bold">{item.Total}</TableCell>
                                            </TableRow>
                                        ))}
                                   </TableBody>
                               </Table>
                           </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    )
}

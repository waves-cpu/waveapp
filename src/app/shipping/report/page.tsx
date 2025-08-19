
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import type { ShippingReceipt, ShippingStatus } from '@/types';
import { subDays, isWithinInterval, startOfDay, endOfDay, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, CheckCircle, Hourglass, Truck, Undo2, XCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const STATUS_COLORS: { [key in ShippingStatus]: string } = {
  pending: "hsl(var(--chart-3))",
  shipped: "hsl(var(--chart-1))",
  delivered: "hsl(var(--chart-2))",
  returned: "hsl(var(--chart-5))",
  cancelled: "hsl(var(--chart-4))",
};

const getStatusDisplay = (status: ShippingStatus, t: any) => {
    const displays: {[key in ShippingStatus]: { icon: React.ElementType, text: string }} = {
        pending: { icon: Hourglass, text: t.statuses.pending },
        shipped: { icon: Truck, text: t.statuses.shipped },
        delivered: { icon: CheckCircle, text: t.statuses.delivered },
        cancelled: { icon: XCircle, text: t.statuses.cancelled },
        returned: { icon: Undo2, text: t.statuses.returned },
    };
    return displays[status] || displays.pending;
}


export default function ShippingReportPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const TReceipt = t.receiptPage;
  const { shippingReceipts, loading } = useInventory();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: subDays(new Date(), 29),
      to: new Date(),
  });

  const filteredReceipts = useMemo(() => {
    return shippingReceipts.filter(receipt => {
        if (!dateRange || !dateRange.from) return true;
        const scannedDate = new Date(receipt.scannedAt);
        const toDate = dateRange.to || dateRange.from;
        return isWithinInterval(scannedDate, { start: startOfDay(dateRange.from), end: endOfDay(toDate) });
    });
  }, [shippingReceipts, dateRange]);

  const reportData = useMemo(() => {
    const totalByService: { [key: string]: number } = {};
    const totalByStatus: { [key: string]: number } = { pending: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0 };
    
    filteredReceipts.forEach(receipt => {
        totalByService[receipt.shippingService] = (totalByService[receipt.shippingService] || 0) + 1;
        totalByStatus[receipt.status] = (totalByStatus[receipt.status] || 0) + 1;
    });

    const statusChartData = Object.entries(totalByStatus)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
            name: TReceipt.statuses[name as ShippingStatus] || name,
            value,
            fill: STATUS_COLORS[name as ShippingStatus]
        }));
    
    return { totalByService, statusChartData };

  }, [filteredReceipts, TReceipt.statuses]);


  return (
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-bold">{t.shipping.report}</h1>
            </div>
             <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-full md:w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                    ) : (
                        format(dateRange.from, "LLL dd, y")
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
                />
                </PopoverContent>
            </Popover>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            {Object.entries(reportData.totalByService).map(([service, count]) => (
                 <Card key={service}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{service}</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{count}</div>
                        <p className="text-xs text-muted-foreground">total resi</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle className="text-base">Ringkasan Status</CardTitle>
                </CardHeader>
                <CardContent>
                   {reportData.statusChartData.length > 0 ? (
                        <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Pie data={reportData.statusChartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                        {reportData.statusChartData.map(entry => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                   ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                            Tidak ada data untuk ditampilkan.
                        </div>
                   )}
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                 <CardHeader>
                    <CardTitle className="text-base">Daftar Resi</CardTitle>
                    <CardDescription>Semua resi dalam rentang tanggal yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border-t">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Tanggal Scan</TableHead>
                                    <TableHead>No. Resi</TableHead>
                                    <TableHead>Jasa Kirim</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Memuat data...</TableCell></TableRow>
                               ) : filteredReceipts.length > 0 ? (
                                   filteredReceipts.map(receipt => {
                                        const { icon: Icon, text } = getStatusDisplay(receipt.status, TReceipt);
                                        return (
                                             <TableRow key={receipt.id}>
                                                <TableCell>{format(new Date(receipt.scannedAt), 'd MMM, HH:mm')}</TableCell>
                                                <TableCell className="font-mono">{receipt.receiptNumber}</TableCell>
                                                <TableCell>{receipt.shippingService}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" style={{ color: STATUS_COLORS[receipt.status] }} />
                                                        <span>{text}</span>
                                                    </div>
                                                </TableCell>
                                             </TableRow>
                                        )
                                   })
                               ) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Tidak ada data.</TableCell></TableRow>
                               )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </AppLayout>
  );
}

    
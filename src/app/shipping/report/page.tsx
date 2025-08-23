
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ShippingReceipt, ShippingStatus } from '@/types';
import { subDays, isWithinInterval, startOfDay, endOfDay, format, eachDayOfInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, CheckCircle, Hourglass, Truck, Undo2, XCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusDisplay = (status: ShippingStatus, t: any) => {
    const displays: {[key in ShippingStatus]: { icon: React.ElementType, text: string, color: string }} = {
        pending: { icon: Hourglass, text: t.statuses.pending, color: 'text-yellow-500' },
        shipped: { icon: Truck, text: t.statuses.shipped, color: 'text-blue-500' },
        delivered: { icon: CheckCircle, text: t.statuses.delivered, color: 'text-green-500' },
        cancelled: { icon: XCircle, text: t.statuses.cancelled, color: 'text-red-500' },
        returned: { icon: Undo2, text: t.statuses.returned, color: 'text-orange-500' },
    };
    return displays[status] || displays.pending;
}

function ReportSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-24 mb-2" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-5 w-3/4" />)}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        </div>
    )
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
    const services = ['SPX', 'J&T', 'JNE', 'INSTANT'];
    const summaryByService: { [key: string]: { [key in ShippingStatus]: number } & { total: number } } = Object.fromEntries(
        services.map(service => [service, { pending: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0, total: 0 }])
    );
    
    const shippedByDay: { [key: string]: number } = {};
    
    filteredReceipts.forEach(receipt => {
        if (summaryByService[receipt.shippingService]) {
            summaryByService[receipt.shippingService][receipt.status]++;
            summaryByService[receipt.shippingService].total++;
        }
        
        // Count receipts with status 'shipped' for the daily trend chart
        if (receipt.status === 'shipped') {
            const day = format(new Date(receipt.scannedAt), 'yyyy-MM-dd');
            shippedByDay[day] = (shippedByDay[day] || 0) + 1;
        }
    });

    const dailyShippedChartData = (dateRange?.from && dateRange?.to) 
      ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
          const formattedDay = format(day, 'yyyy-MM-dd');
          return {
              date: format(day, 'dd MMM'),
              Terkirim: shippedByDay[formattedDay] || 0,
          };
      })
      : [];

    return { summaryByService, dailyShippedChartData };

  }, [filteredReceipts, dateRange]);


  if (loading) {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                 <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.shipping.report}</h1>
                </div>
                <ReportSkeleton />
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
            {Object.entries(reportData.summaryByService).map(([service, summary]) => (
                 <Card key={service}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            {service}
                        </CardTitle>
                        <CardDescription className="text-xs">Total Resi: {summary.total}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        {(Object.keys(summary) as (ShippingStatus | 'total')[]).map(status => {
                            if (status === 'total' || summary[status] === 0) return null;
                            const display = getStatusDisplay(status, TReceipt);
                            return (
                                <div key={status} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <display.icon className={cn("h-4 w-4", display.color)} />
                                        <span>{display.text}</span>
                                    </div>
                                    <span className="font-semibold">{summary[status]}</span>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-base">Tren Pengiriman Harian</CardTitle>
                <CardDescription>Jumlah resi yang berstatus "Terkirim" setiap harinya.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.dailyShippedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Terkirim" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}

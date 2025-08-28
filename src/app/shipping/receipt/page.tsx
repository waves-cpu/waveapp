
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileDown, Printer, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data representing data scanned/inputted from a mobile device
const mockReceipts = [
  { awb: 'SPXID0123456789A', orderId: '240828ABCDEFGH', customer: 'Budi Santoso', channel: 'Shopee', status: 'Dikirim' },
  { awb: 'SPXID0123456789B', orderId: '240828IJKLMNOP', customer: 'Citra Lestari', channel: 'Shopee', status: 'Perlu Diproses' },
  { awb: 'JP1234567890', orderId: 'INV/20240828/001', customer: 'Agus Wijaya', channel: 'Tokopedia', status: 'Selesai' },
  { awb: '005432109876', orderId: 'LZD-987654321', customer: 'Siti Aminah', channel: 'Lazada', status: 'Dikirim' },
  { awb: 'TIKTOK-XYZ123', orderId: 'TK-123456789', customer: 'Rina Marlina', channel: 'Tiktok Shop', status: 'Dibatalkan' },
];

type ShippingProvider = 'all' | 'shopee' | 'tokopedia' | 'lazada' | 'tiktok';
type ReceiptData = typeof mockReceipts[0];

const ShippingTable = ({ data, serviceName }: { data: ReceiptData[], serviceName: string }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>No. Resi (AWB)</TableHead>
                <TableHead>ID Pesanan</TableHead>
                <TableHead className="hidden md:table-cell">Pelanggan</TableHead>
                <TableHead>Status</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(item => (
                <TableRow key={item.awb}>
                    <TableCell className="font-medium">{item.awb}</TableCell>
                    <TableCell>{item.orderId}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.customer}</TableCell>
                    <TableCell>
                        <Badge variant={item.status === 'Selesai' ? 'default' : item.status === 'Dibatalkan' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Truck className="h-16 w-16" />
                            <p className="font-semibold">Tidak ada resi untuk {serviceName}</p>
                            <p className="text-sm">Data resi yang di-scan atau diinput dari mobile akan muncul di sini.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


export default function ReceiptPage() {
    const [activeTab, setActiveTab] = useState<ShippingProvider>('all');
    
    const filteredData = useMemo(() => {
        if (activeTab === 'all') return mockReceipts;
        return mockReceipts.filter(r => r.channel.toLowerCase().replace(' shop', '') === activeTab);
    }, [activeTab]);
    
    const getTabName = (tab: ShippingProvider) => {
        if(tab === 'all') return 'Semua';
        if(tab === 'tokopedia') return 'Tokopedia';
        return tab.charAt(0).toUpperCase() + tab.slice(1);
    }

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           Resi Pengiriman
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sinkronisasi
                        </Button>
                        <Button size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak Massal
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b pb-2">
                        {(['all', 'shopee', 'tokopedia', 'lazada', 'tiktok'] as ShippingProvider[]).map(tab => (
                            <Button 
                                key={tab}
                                variant={activeTab === tab ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab(tab)}
                                className="shrink-0"
                            >
                                {getTabName(tab)}
                                <Badge variant="secondary" className="ml-2">
                                    {tab === 'all' ? mockReceipts.length : mockReceipts.filter(r => r.channel.toLowerCase().replace(' shop', '') === tab).length}
                                </Badge>
                            </Button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <ShippingTable data={filteredData} serviceName={getTabName(activeTab)} />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}

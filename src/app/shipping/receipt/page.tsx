
'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { FileDown, Printer, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data - replace with actual data fetching
const mockData = {
  spx: [
    { id: 'SPX001', customer: 'Budi Santoso', address: 'Jl. Merdeka No. 10, Jakarta', status: 'Dikirim' },
    { id: 'SPX002', customer: 'Citra Lestari', address: 'Jl. Pahlawan No. 5, Surabaya', status: 'Perlu Diproses' },
  ],
  jnt: [
    { id: 'JNT001', customer: 'Agus Wijaya', address: 'Jl. Kemerdekaan No. 20, Bandung', status: 'Selesai' },
  ],
  jne: [],
  instant: [
     { id: 'GOJ001', customer: 'Dewi Anggraini', address: 'Jl. Gatot Subroto No. 1, Jakarta Selatan', status: 'Mencari Driver' },
  ],
};

type ShippingData = {
    id: string;
    customer: string;
    address: string;
    status: 'Dikirim' | 'Perlu Diproses' | 'Selesai' | 'Mencari Driver' | 'Dibatalkan';
}

const ShippingTable = ({ data, serviceName }: { data: ShippingData[], serviceName: string }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>ID Pesanan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="hidden md:table-cell">Alamat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {data.length > 0 ? data.map(item => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.customer}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-sm truncate">{item.address}</TableCell>
                    <TableCell>
                        <Badge variant={item.status === 'Selesai' ? 'default' : 'secondary'}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm">Cetak Resi</Button>
                    </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Truck className="h-16 w-16" />
                            <p className="font-semibold">Tidak ada pesanan untuk {serviceName}</p>
                            <p className="text-sm">Coba sinkronkan pesanan atau periksa kembali nanti.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);


export default function ReceiptPage() {
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
                        <Button variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sinkronisasi
                        </Button>
                        <Button>
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak Massal
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="spx">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="spx">SPX</TabsTrigger>
                        <TabsTrigger value="jnt">J&T</TabsTrigger>
                        <TabsTrigger value="jne">JNE</TabsTrigger>
                        <TabsTrigger value="instant">Instant</TabsTrigger>
                    </TabsList>
                    <TabsContent value="spx">
                        <Card>
                             <CardContent className="pt-6">
                                <ShippingTable data={mockData.spx} serviceName="SPX" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="jnt">
                         <Card>
                             <CardContent className="pt-6">
                                <ShippingTable data={mockData.jnt} serviceName="J&T" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="jne">
                         <Card>
                             <CardContent className="pt-6">
                                <ShippingTable data={mockData.jne} serviceName="JNE" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="instant">
                         <Card>
                             <CardContent className="pt-6">
                                <ShippingTable data={mockData.instant} serviceName="Instant" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </AppLayout>
    );
}

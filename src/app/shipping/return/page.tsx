
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FilePlus, ScanLine, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Mock data for returned receipts
const mockReturns = [
  { awb: 'SPXID0123456789C', date: '2024-08-02', channel: 'Shopee', status: 'Diterima Gudang' },
  { awb: 'SPXID0123456789D', date: '2024-08-01', channel: 'Shopee', status: 'Perlu Dicek' },
  { awb: 'JP0987654321', date: '2024-08-01', channel: 'Tokopedia', status: 'Selesai' },
];

type ReturnData = typeof mockReturns[0];


export default function ReturnPage() {
    const [returns, setReturns] = useState(mockReturns);

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           Kelola Return Pengiriman
                        </h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <FilePlus className="mr-2 h-4 w-4" />
                            Proses Refund
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scan Resi Return</CardTitle>
                            <CardDescription>Scan atau masukkan nomor resi yang diretur untuk menambahkannya ke daftar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="relative md:max-w-sm">
                                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Scan atau masukkan No. Resi (AWB)"
                                    className="pl-10 w-full"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <CardTitle>Daftar Return</CardTitle>
                            <CardDescription>Berikut adalah daftar resi yang telah ditandai sebagai return.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No. Resi (AWB)</TableHead>
                                        <TableHead>Tanggal Return</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returns.length > 0 ? returns.map(item => (
                                        <TableRow key={item.awb}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{item.date}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'Selesai' ? 'default' : item.status === 'Perlu Dicek' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="outline" size="sm">
                                                    <Undo2 className="mr-2 h-3 w-3" />
                                                    Proses
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Undo2 className="h-16 w-16" />
                                                    <p className="font-semibold">Belum ada data return</p>
                                                    <p className="text-sm">Scan resi return untuk memulainya.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}


'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Undo2, Truck, CheckCircle, Package, Search, Send, Ban, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt, ReturnedItem } from '@/types';
import { parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessReturnDialog } from '@/app/components/process-return-dialog';
import { formatToWIB } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const SHIPPING_CHANNEL_OPTIONS = ['Semua Jasa Kirim', 'SPX', 'J&T', 'JNE', 'INSTANT', 'CARGO'];

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'return selesai': return 'default';
        case 'siap kirim': return 'secondary';
        case 'terproses': return 'secondary';
        case 'diantar': return 'secondary';
        case 'return':
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

type StatusTab = 'Terproses' |'Siap Kirim' | 'Return' | 'Selesai' | 'Return Selesai' | 'Dibatalkan';

const ReceiptTable = ({ 
    receipts, 
    onAction,
}: { 
    receipts: ShippingReceipt[], 
    onAction: (receipt: ShippingReceipt, newStatus: string) => void,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState<string | null>(null);

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => {
            const searchMatch = !searchTerm || r.awb.toLowerCase().includes(searchTerm.toLowerCase());
            const channelMatch = !channelFilter || r.channel === channelFilter;
            return searchMatch && channelMatch;
        });
    }, [receipts, searchTerm, channelFilter]);

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    const paginatedReceipts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReceipts, currentPage, itemsPerPage]);

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari No. Resi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
                <Select value={channelFilter || 'all'} onValueChange={v => setChannelFilter(v === 'all' ? null : v)}>
                    <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Filter Jasa Kirim" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jasa Kirim</SelectItem>
                        {SHIPPING_CHANNEL_OPTIONS.slice(1).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>No. Resi</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kanal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedReceipts.length > 0 ? paginatedReceipts.map(receipt => (
                        <TableRow key={receipt.id}>
                            <TableCell className="font-medium">{receipt.awb}</TableCell>
                            <TableCell>{formatToWIB(parseISO(receipt.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{receipt.channel}</TableCell>
                            <TableCell><Badge variant={getStatusVariant(receipt.status)}>{receipt.status}</Badge></TableCell>
                            <TableCell className="text-right space-x-2">
                                {receipt.status === 'Terproses' && (
                                     <Button size="sm" variant="outline" onClick={() => onAction(receipt, 'Siap Kirim')}>
                                        <Send className="mr-2 h-4 w-4 text-blue-500" />
                                        Tandai Siap Kirim
                                    </Button>
                                )}
                                {receipt.status === 'Siap Kirim' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => onAction(receipt, 'Dibatalkan')}>
                                            <Ban className="mr-2 h-4 w-4 text-destructive" />
                                            Batalkan
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => onAction(receipt, 'Selesai')}>
                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                            Tandai Selesai
                                        </Button>
                                    </>
                                )}
                                {receipt.status === 'Return' && (
                                    <Button size="sm" variant="outline" onClick={() => onAction(receipt, 'Return Selesai')}>
                                        <Package className="mr-2 h-4 w-4" />
                                        Proses Barang
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Tidak ada resi dengan status ini.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="pt-4 border-t">
                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default function ManageReceiptsPage() {
    const { allShippingReceipts, updateShippingReceiptStatus, returnSaleTransaction, loading } = useInventory();
    const { toast } = useToast();
    const [receiptToProcess, setReceiptToProcess] = useState<ShippingReceipt | null>(null);

    const handleAction = useCallback(async (receipt: ShippingReceipt, newStatus: string) => {
        if (newStatus === 'Return Selesai') {
            setReceiptToProcess(receipt);
        } else {
            try {
                await updateShippingReceiptStatus(receipt.id, newStatus);
                toast({ title: 'Status Diperbarui', description: `Status untuk resi ${receipt.awb} telah diubah.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Memperbarui Status' });
            }
        }
    }, [updateShippingReceiptStatus, toast]);

    const handleProcessReturn = async (transactionId: string, items: ReturnedItem[]) => {
        if (!receiptToProcess) return;
        try {
            await returnSaleTransaction(transactionId, items);
            await updateShippingReceiptStatus(receiptToProcess.id, 'Return Selesai');
            toast({ title: 'Return Diproses', description: `Stok untuk transaksi ${transactionId} telah dikembalikan.` });
            setReceiptToProcess(null); // Close dialog
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Memproses Return', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
            throw error; // Prevent dialog from closing on error
        }
    };

    const groupedReceipts = useMemo(() => {
        const groups: Record<StatusTab, ShippingReceipt[]> = {
            'Terproses': [],
            'Siap Kirim': [],
            'Return': [],
            'Selesai': [],
            'Return Selesai': [],
            'Dibatalkan': []
        };
        allShippingReceipts.forEach(r => {
            if (r.status in groups) {
                groups[r.status as StatusTab].push(r);
            }
        });
        return groups;
    }, [allShippingReceipts]);
    
    const tabs: { status: StatusTab, icon: React.ElementType }[] = [
        { status: 'Terproses', icon: Truck },
        { status: 'Siap Kirim', icon: Truck },
        { status: 'Selesai', icon: CheckCircle },
        { status: 'Return', icon: Undo2 },
        { status: 'Return Selesai', icon: History },
        { status: 'Dibatalkan', icon: Ban },
    ];

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 md:hidden" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <Skeleton className="h-96 w-full" />
                </main>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Kelola Status Resi</h1>
                </div>

                <Tabs defaultValue="Terproses" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.status} value={tab.status}>
                                <tab.icon className="mr-2 h-4 w-4" />
                                {tab.status}
                                <Badge variant="secondary" className="ml-2">{groupedReceipts[tab.status].length}</Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {tabs.map(tab => (
                        <TabsContent key={tab.status} value={tab.status} className="mt-6">
                            <ReceiptTable 
                                receipts={groupedReceipts[tab.status]} 
                                onAction={handleAction}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </main>
            <ProcessReturnDialog
                open={!!receiptToProcess}
                onOpenChange={(isOpen) => !isOpen && setReceiptToProcess(null)}
                onProcessReturn={handleProcessReturn}
                receipt={receiptToProcess}
            />
        </AppLayout>
    );
}

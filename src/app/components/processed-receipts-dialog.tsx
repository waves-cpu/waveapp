

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreVertical, Search, Send, Trash2, Undo2, CheckCircle, Ban, PackageCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, subDays } from 'date-fns';
import { useInventory } from '@/hooks/use-inventory';
import type { ShippingReceipt } from '@/types';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatToWIB } from '@/lib/utils';

const SALES_CHANNEL_OPTIONS = ['Semua Kanal', 'Shopee', 'Tiktok', 'Lazada'];
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

interface ProcessedReceiptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date | null;
  onDataChange: () => void;
  initialStatusFilter?: string | null;
  initialChannelFilter?: string | null;
}

export function ProcessedReceiptsDialog({ 
    open, 
    onOpenChange, 
    currentDate, 
    onDataChange, 
    initialStatusFilter,
    initialChannelFilter,
}: ProcessedReceiptsDialogProps) {
  const { 
    fetchShippingReceipts, 
    deleteShippingReceipt, 
    cancelSaleTransaction, 
    updateShippingReceiptStatus,
    updateShippingReceiptsStatus 
  } = useInventory();
  const { toast } = useToast();

  const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSalesChannel, setActiveSalesChannel] = useState<string | null>(null);
  
  const loadReceipts = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    
    let fetchOptions: Parameters<typeof fetchShippingReceipts>[0] = {
        page: currentPage,
        limit: itemsPerPage,
        salesChannel: activeSalesChannel || undefined,
        channel: initialChannelFilter || undefined,
        awb: searchTerm,
    };
    
    // Smart logic for handling special filters from the dashboard
    switch (initialStatusFilter) {
        case 'Tertunda':
            fetchOptions.status = ['Terproses'];
            if (currentDate) {
                 fetchOptions.beforeDate = formatToWIB(subDays(currentDate, 0), 'yyyy-MM-dd');
            }
            break;
        case 'Terproses Hari Ini':
            fetchOptions.status = ['Terproses'];
            if (currentDate) {
                fetchOptions.dateString = formatToWIB(currentDate, 'yyyy-MM-dd');
            }
            break;
        default:
            if(initialStatusFilter) {
                fetchOptions.status = [initialStatusFilter];
            }
            if (currentDate) {
                 fetchOptions.dateString = formatToWIB(currentDate, 'yyyy-MM-dd');
            }
            break;
    }


    try {
        const { receipts: fetchedReceipts, total } = await fetchShippingReceipts(fetchOptions);
        setReceipts(fetchedReceipts);
        setTotalReceipts(total);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal memuat resi' });
    } finally {
        setLoading(false);
    }
  }, [
      open, fetchShippingReceipts, toast, currentPage, itemsPerPage, 
      activeSalesChannel, initialChannelFilter, searchTerm, 
      initialStatusFilter, currentDate
  ]);


  useEffect(() => {
    if (open) {
      loadReceipts();
    } else {
      // Reset state when dialog closes
      setSearchTerm('');
      setActiveSalesChannel(null);
      setSelectedIds(new Set());
      setCurrentPage(1);
    }
  }, [open, currentPage, itemsPerPage, activeSalesChannel, searchTerm, loadReceipts]);
  
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeSalesChannel, searchTerm]);
  
  const handleDataChange = async () => {
    await loadReceipts();
    onDataChange();
  };

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const toastRef = toast({ title: 'Memproses...', description: `Memproses ${selectedIds.size} resi...` });
    try {
      await updateShippingReceiptsStatus(Array.from(selectedIds), newStatus);
      toastRef.update({ id: toastRef.id, title: 'Berhasil', description: `Status untuk ${selectedIds.size} resi berhasil diubah.` });
      setSelectedIds(new Set());
      await handleDataChange();
    } catch (error) {
      toastRef.update({ id: toastRef.id, title: 'Gagal', description: 'Terjadi kesalahan saat memperbarui status.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (receiptToDelete: ShippingReceipt) => {
    if (!receiptToDelete) return;
    const toastRef = toast({ title: 'Menghapus...', description: `Menghapus resi ${receiptToDelete.awb}...` });
    try {
        if (receiptToDelete.transactionId) {
            await cancelSaleTransaction(receiptToDelete.transactionId);
        }
        await deleteShippingReceipt(receiptToDelete.id);
        toastRef.update({ id: toastRef.id, title: 'Resi Dihapus', description: 'Resi dihapus dan stok telah dikembalikan.' });
        await handleDataChange();
    } catch (error) {
        toastRef.update({ id: toastRef.id, title: 'Gagal Menghapus', description: 'Gagal menghapus resi.', variant: 'destructive' });
    }
  };

  const handleChangeStatus = async (receipt: ShippingReceipt, newStatus: string) => {
    const toastRef = toast({ title: 'Memperbarui Status...', description: 'Mengubah status resi...' });
    try {
        await updateShippingReceiptStatus(receipt.id, newStatus);
        toastRef.update({ id: toastRef.id, title: 'Status Diperbarui', description: `Status resi telah diubah menjadi "${newStatus}".` });
        await handleDataChange();
    } catch (error) {
        toastRef.update({ id: toastRef.id, title: 'Gagal Memperbarui', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(new Set(checked ? receipts.map(r => r.id) : []));
  };

  const handleSelectOne = (id: number, isChecked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    isChecked ? newSelectedIds.add(id) : newSelectedIds.delete(id);
    setSelectedIds(newSelectedIds);
  };
  
  const totalPages = Math.ceil(totalReceipts / itemsPerPage);
  const isAllSelected = receipts.length > 0 && receipts.every(r => selectedIds.has(r.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Daftar Resi: {initialStatusFilter}</DialogTitle>
          <DialogDescription>
            Kelola dan proses semua resi yang memiliki status '{initialStatusFilter}'.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-t border-b">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={activeSalesChannel || 'Semua Kanal'} onValueChange={(v) => setActiveSalesChannel(v === 'Semua Kanal' ? null : v)}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {SALES_CHANNEL_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Resi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9 w-full md:w-48"
                    />
                 </div>
                 {selectedIds.size > 0 && initialStatusFilter === 'Terproses' && (
                    <Button size="sm" onClick={() => handleBulkAction('Siap Kirim')} disabled={isProcessing}>
                        <Send className="mr-2 h-4 w-4" />
                        {isProcessing ? 'Memproses...' : `Proses Kirim (${selectedIds.size})`}
                    </Button>
                 )}
                 {selectedIds.size > 0 && initialStatusFilter === 'Siap Kirim' && (
                    <>
                        <Button size="sm" onClick={() => handleBulkAction('Selesai')} disabled={isProcessing}>
                            <PackageCheck className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Memproses...' : `Tandai Selesai (${selectedIds.size})`}
                        </Button>
                         <Button size="sm" variant="destructive" onClick={() => handleBulkAction('Dibatalkan')} disabled={isProcessing}>
                            <Ban className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Memproses...' : `Batalkan (${selectedIds.size})`}
                        </Button>
                    </>
                 )}
            </div>
        </div>

        <div className="flex-grow overflow-hidden">
          <Card className="h-full flex flex-col border-none shadow-none">
            <CardContent className="p-0 flex-grow overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12"><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                    <TableHead>No. Resi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kanal Penjualan</TableHead>
                    <TableHead>Jasa Kirim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : receipts.length > 0 ? receipts.map(item => (
                    <TableRow key={item.id} data-state={selectedIds.has(item.id) && 'selected'}>
                      <TableCell><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={(c) => handleSelectOne(item.id, !!c)} /></TableCell>
                      <TableCell className="font-medium">{item.awb}</TableCell>
                      <TableCell>{formatToWIB(parseISO(item.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{item.salesChannel}</TableCell>
                      <TableCell>{item.channel}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(initialStatusFilter === 'Terproses' || initialStatusFilter === 'Terproses Hari Ini' || initialStatusFilter === 'Tertunda') && <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Siap Kirim')}><Send className="mr-2 h-4 w-4" /> Tandai Siap Kirim</DropdownMenuItem>}
                            {initialStatusFilter === 'Siap Kirim' && <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Selesai')}><CheckCircle className="mr-2 h-4 w-4" /> Tandai Selesai</DropdownMenuItem>}
                            {initialStatusFilter === 'Selesai' && <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Return')}><Undo2 className="mr-2 h-4 w-4 text-orange-500" /> Tandai Return</DropdownMenuItem>}
                            
                            {initialStatusFilter !== 'Dibatalkan' && initialStatusFilter !== 'Selesai' && <DropdownMenuItem onClick={() => handleChangeStatus(item, 'Dibatalkan')} className="text-destructive"><Ban className="mr-2 h-4 w-4" /> Batalkan</DropdownMenuItem>}

                            {initialStatusFilter !== 'Selesai' && (
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Hapus Resi Ini?</AlertDialogTitle>
                                          <AlertDialogDescription>Aksi ini akan menghapus resi dan mengembalikan stok jika ada penjualan terkait.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Batal</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground">Tidak ada resi yang cocok dengan filter Anda.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        {totalPages > 1 && (
            <div className="flex items-center justify-end pt-4 border-t">
              <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

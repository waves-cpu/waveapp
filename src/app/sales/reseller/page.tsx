

'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Trash2, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useInventory } from '@/hooks/use-inventory';
import type { Reseller, Sale } from '@/types';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { formatToWIB } from '@/lib/utils';
import { parseISO } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function ResellerList() {
    const { resellers, deleteReseller, allSales, loading } = useInventory();
    const { toast } = useToast();
    const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = async () => {
        if (!resellerToDelete) return;
        try {
            await deleteReseller(resellerToDelete.id);
            toast({
                title: 'Reseller Dihapus',
                description: `Reseller "${resellerToDelete.name}" telah berhasil dihapus.`,
            });
        } catch (error) {
            toast({
                title: 'Gagal Menghapus',
                description: 'Terjadi kesalahan saat menghapus reseller.',
                variant: 'destructive',
            });
        } finally {
            setResellerToDelete(null);
        }
    };
    
    const filteredResellers = (resellers || [])
        .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(reseller => {
            const resellerSales = allSales.filter(sale => sale.resellerId === reseller.id && sale.status === 'Completed');
            const totalOmzet = resellerSales.reduce((sum, sale) => sum + (sale.priceAtSale * sale.quantity), 0);
            return { ...reseller, transactionCount: resellerSales.length, totalOmzet };
        })
        .sort((a, b) => b.totalOmzet - a.totalOmzet);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
        )
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-end">
                <Input 
                    placeholder="Cari reseller..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Reseller</TableHead>
                            <TableHead>Kontak</TableHead>
                            <TableHead>Total Transaksi</TableHead>
                            <TableHead>Total Omzet</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredResellers.length > 0 ? filteredResellers.map(reseller => (
                            <TableRow key={reseller.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/sales/reseller/${reseller.id}`} className="hover:underline text-primary">
                                        {reseller.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{reseller.phone || '-'}</TableCell>
                                <TableCell>{reseller.transactionCount.toLocaleString('id-ID')}</TableCell>
                                <TableCell>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reseller.totalOmzet)}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/sales/reseller/edit/${reseller.id}`}>
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setResellerToDelete(reseller)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Belum ada data reseller.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <AlertDialog open={!!resellerToDelete} onOpenChange={(open) => !open && setResellerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin ingin menghapus reseller ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus data reseller "{resellerToDelete?.name}" secara permanen. Transaksi yang terhubung tidak akan dihapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


export default function ResellerPage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Manajemen Reseller</h1>
                    </div>
                    <Button asChild>
                        <Link href="/sales/reseller/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tambah Reseller Baru
                        </Link>
                    </Button>
                </div>
                
                <ResellerList />
            </main>
        </AppLayout>
    );
}

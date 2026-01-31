'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Button } from '@/components/ui/button';
import { PlusCircle, Tags, Trash2, Calendar, MoreVertical, Edit, Search, LayoutGrid, List } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventory } from '@/hooks/use-inventory';
import type { DiscountGroup } from '@/types';
import { isAfter, isBefore, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { formatToWIB } from '@/lib/utils';
import { Input } from '@/components/ui/input';

function getStatus(startDate: string, endDate: string): { text: string; variant: 'default' | 'secondary' | 'outline' } {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (isBefore(now, start)) {
        return { text: 'Dijadwalkan', variant: 'secondary' };
    }
    if (isAfter(now, end)) {
        return { text: 'Berakhir', variant: 'outline' };
    }
    return { text: 'Aktif', variant: 'default' };
}

export default function DiscountGroupPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { discountGroups, fetchDiscountGroups, deleteDiscountGroup, loading } = useInventory();
    const { toast } = useToast();
    const [groupToDelete, setGroupToDelete] = useState<DiscountGroup | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    useEffect(() => {
        fetchDiscountGroups();
    }, [fetchDiscountGroups]);

    const filteredDiscountGroups = discountGroups
        .filter(g => !g.voucherCode)
        .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const handleDelete = async () => {
        if (!groupToDelete) return;
        try {
            await deleteDiscountGroup(groupToDelete.id);
            toast({
                title: 'Grup Diskon Dihapus',
                description: `Grup "${groupToDelete.name}" telah berhasil dihapus.`,
            });
        } catch (error) {
            toast({
                title: 'Gagal Menghapus',
                description: 'Terjadi kesalahan saat menghapus grup diskon.',
                variant: 'destructive',
            });
        } finally {
            setGroupToDelete(null);
        }
    };

    const renderActions = (group: DiscountGroup) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                 <DropdownMenuItem asChild>
                     <Link href={`/promotions/discount-groups/edit/${group.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Ubah
                     </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setGroupToDelete(group)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Grup Diskon Otomatis</h1>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari grup diskon..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 sm:w-[200px] md:w-[300px] h-9"
                            />
                        </div>
                         <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button
                                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('card')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild>
                            <Link href="/promotions/discount-groups/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Buat Grup Baru
                            </Link>
                        </Button>
                    </div>
                </div>
                
                {loading ? <p>Memuat...</p> : 
                !filteredDiscountGroups.length ? (
                     <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Tags className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'Tidak Ditemukan' : 'Belum Ada Grup Diskon'}</h3>
                        <p className="mt-1 text-sm">{searchTerm ? `Tidak ada grup diskon yang cocok dengan pencarian "${searchTerm}".` : 'Buat grup diskon pertama Anda untuk memulai promosi otomatis.'}</p>
                         <Button asChild className="mt-4">
                            <Link href="/promotions/discount-groups/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Buat Grup Diskon Baru
                            </Link>
                        </Button>
                    </div>
                ) : viewMode === 'card' ? (
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDiscountGroups.map(group => {
                            const status = getStatus(group.startDate, group.endDate);
                            return (
                                <Card key={group.id} className="flex flex-col">
                                    <CardHeader className="flex-row items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Tags className="h-5 w-5 text-primary" />
                                                {group.name}
                                            </CardTitle>
                                            <CardDescription>
                                                Kategori: {group.category} | Kanal: <span className="capitalize">{group.channel}</span>
                                            </CardDescription>
                                            <div className="text-sm font-semibold pt-1">{group.productCount || 0} SKU</div>
                                        </div>
                                        {renderActions(group)}
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatToWIB(parseISO(group.startDate), 'dd MMM yyyy')} - {formatToWIB(parseISO(group.endDate), 'dd MMM yyyy')}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-2">
                                            Otomatis berlaku untuk produk dalam kategori yang dipilih.
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Badge variant={status.variant}>{status.text}</Badge>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Grup</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead>Kanal</TableHead>
                                    <TableHead className="text-center">Jumlah SKU</TableHead>
                                    <TableHead>Durasi</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDiscountGroups.map(group => {
                                    const status = getStatus(group.startDate, group.endDate);
                                    return (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">{group.name}</TableCell>
                                            <TableCell>{group.category}</TableCell>
                                            <TableCell className="capitalize">{group.channel}</TableCell>
                                            <TableCell className="text-center">{group.productCount || 0}</TableCell>
                                            <TableCell>{formatToWIB(parseISO(group.startDate), 'dd MMM yyyy')} - {formatToWIB(parseISO(group.endDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.text}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {renderActions(group)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )}

            </main>
             <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin ingin menghapus grup ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus grup diskon "{groupToDelete?.name}" secara permanen. Aksi ini tidak bisa dibatalkan.
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
        </AppLayout>
    );
}

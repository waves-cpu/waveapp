
'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, Trash2, Calendar, MoreVertical, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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

export default function VouchersPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { discountGroups, fetchDiscountGroups, deleteDiscountGroup, loading } = useInventory();
    const { toast } = useToast();
    const [groupToDelete, setGroupToDelete] = useState<DiscountGroup | null>(null);

    useEffect(() => {
        fetchDiscountGroups();
    }, [fetchDiscountGroups]);

    const voucherGroups = discountGroups.filter(g => g.voucherCode);

    const handleDelete = async () => {
        if (!groupToDelete) return;
        try {
            await deleteDiscountGroup(groupToDelete.id);
            toast({
                title: 'Voucher Dihapus',
                description: `Voucher "${groupToDelete.name}" telah berhasil dihapus.`,
            });
        } catch (error) {
            toast({
                title: 'Gagal Menghapus',
                description: 'Terjadi kesalahan saat menghapus voucher.',
                variant: 'destructive',
            });
        } finally {
            setGroupToDelete(null);
        }
    };

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Voucher Diskon</h1>
                    </div>
                    <Button asChild>
                        <Link href="/promotions/discount-groups/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Buat Voucher Baru
                        </Link>
                    </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {voucherGroups.map(group => {
                        const status = getStatus(group.startDate, group.endDate);
                        return (
                            <Card key={group.id} className="flex flex-col">
                                <CardHeader className="flex-row items-start justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Ticket className="h-5 w-5 text-primary" />
                                            {group.name}
                                        </CardTitle>
                                        <CardDescription>
                                            Kategori: {group.category} | Kanal: <span className="capitalize">{group.channel}</span>
                                        </CardDescription>
                                    </div>
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
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="font-mono text-center bg-muted rounded-md p-2 border border-dashed mb-4">
                                        {group.voucherCode}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatToWIB(parseISO(group.startDate), 'dd MMM yyyy')} - {formatToWIB(parseISO(group.endDate), 'dd MMM yyyy')}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-2">
                                        {group.productCount || 0} produk termasuk dalam diskon ini.
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Badge variant={status.variant}>{status.text}</Badge>
                                </CardFooter>
                            </Card>
                        )
                    })}

                    {!loading && voucherGroups.length === 0 && (
                         <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Ticket className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Belum Ada Voucher</h3>
                            <p className="mt-1 text-sm">Buat voucher pertama Anda untuk memulai promosi.</p>
                             <Button asChild className="mt-4">
                                <Link href="/promotions/discount-groups/new">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Buat Voucher Baru
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

            </main>
             <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin ingin menghapus voucher ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus voucher "{groupToDelete?.name}" secara permanen. Aksi ini tidak bisa dibatalkan.
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

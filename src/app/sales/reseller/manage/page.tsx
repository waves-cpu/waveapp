'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreVertical, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import type { Reseller } from '@/types';
import { getResellerTier } from '@/lib/reseller-tiers';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const resellerFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Nama reseller minimal 2 karakter."),
  phone: z.string().optional(),
  address: z.string().optional(),
});

function ResellerFormDialog({
    reseller,
    onSave,
}: {
    reseller?: Reseller;
    onSave: (data: z.infer<typeof resellerFormSchema>) => Promise<void>;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof resellerFormSchema>>({
        resolver: zodResolver(resellerFormSchema),
        defaultValues: reseller || { name: '', phone: '', address: '' },
    });
    
    useEffect(() => {
        if(isOpen) {
            form.reset(reseller || { name: '', phone: '', address: '' });
        }
    }, [isOpen, reseller, form]);

    const onSubmit = async (data: z.infer<typeof resellerFormSchema>) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
            setIsOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!reseller;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {isEditMode ? (
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="mr-2 h-4 w-4" /> Ubah
                    </DropdownMenuItem>
                ) : (
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" /> Tambah Reseller
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Ubah Reseller' : 'Tambah Reseller Baru'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Ubah detail reseller yang sudah ada.' : 'Masukkan detail untuk reseller baru.'}
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nama Reseller</FormLabel><FormControl><Input placeholder="Nama lengkap reseller" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Nomor Telepon (Opsional)</FormLabel><FormControl><Input placeholder="0812..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Alamat (Opsional)</FormLabel><FormControl><Input placeholder="Alamat lengkap" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function ManageResellerPage() {
    const { resellers, addReseller, editReseller, deleteReseller, loading } = useInventory();
    const { toast } = useToast();
    const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
    
    const handleAddReseller = async (data: z.infer<typeof resellerFormSchema>) => {
        try {
            await addReseller(data.name, data.phone, data.address);
            toast({ title: 'Reseller Ditambahkan', description: `${data.name} telah berhasil dibuat.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menambahkan', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
        }
    };

    const handleEditReseller = async (data: z.infer<typeof resellerFormSchema>) => {
        if (!data.id) return;
        try {
            await editReseller(data.id, data);
            toast({ title: 'Reseller Diperbarui', description: `${data.name} telah berhasil diperbarui.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
        }
    };

    const handleDeleteReseller = async () => {
        if (!resellerToDelete) return;
        try {
            await deleteReseller(resellerToDelete.id);
            toast({ title: 'Reseller Dihapus', description: `${resellerToDelete.name} telah dihapus.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error instanceof Error ? error.message : 'Terjadi kesalahan.' });
        } finally {
            setResellerToDelete(null);
        }
    };

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Kelola Reseller</h1>
                    </div>
                    <ResellerFormDialog onSave={handleAddReseller} />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Reseller</CardTitle>
                        <CardDescription>Daftar semua reseller yang terdaftar di sistem.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>No. Telepon</TableHead>
                                    <TableHead>Total Transaksi</TableHead>
                                    <TableHead>Tingkatan</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resellers.map(reseller => {
                                    const tier = getResellerTier(reseller.totalTransactions || 0);
                                    return (
                                        <TableRow key={reseller.id}>
                                            <TableCell className="font-medium">{reseller.name}</TableCell>
                                            <TableCell>{reseller.phone || '-'}</TableCell>
                                            <TableCell>{(reseller.totalTransactions || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</TableCell>
                                            <TableCell><Badge>{tier.name}</Badge></TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <ResellerFormDialog reseller={reseller} onSave={handleEditReseller} />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => setResellerToDelete(reseller)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {!loading && resellers.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Belum ada reseller yang ditambahkan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
             <AlertDialog open={!!resellerToDelete} onOpenChange={(open) => !open && setResellerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Anda yakin ingin menghapus reseller ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus reseller "{resellerToDelete?.name}" secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReseller} className="bg-destructive hover:bg-destructive/90">
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

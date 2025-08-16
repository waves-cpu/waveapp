
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead,
} from '@/components/ui/table';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Reseller } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import { MoreVertical, UserPlus, Trash2, Pencil } from 'lucide-react';

interface ResellerFormDialogProps {
  onSave: (resellerData: Omit<Reseller, 'id'>) => Promise<void>;
  reseller?: Reseller | null;
  children: React.ReactNode;
}

function ResellerFormDialog({ onSave, reseller, children }: ResellerFormDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const isEditMode = !!reseller;

  useEffect(() => {
    if (isOpen) {
        setName(reseller?.name || '');
        setPhone(reseller?.phone || '');
        setAddress(reseller?.address || '');
    }
  }, [isOpen, reseller]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), phone: phone.trim(), address: address.trim() });
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            {children}
        </DialogTrigger>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>{isEditMode ? 'Ubah Reseller' : 'Tambah Reseller Baru'}</DialogTitle>
                <DialogDescription>
                   {isEditMode ? 'Ubah detail reseller di bawah ini.' : 'Masukkan detail reseller baru di bawah ini.'}
                </DialogDescription>
            </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="reseller-name">Nama Reseller</Label>
                    <Input
                    id="reseller-name"
                    placeholder="Nama..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                    required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="reseller-phone">No. Telepon</Label>
                        <Input
                        id="reseller-phone"
                        placeholder="0812..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isSaving}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reseller-address">Alamat</Label>
                        <Input
                        id="reseller-address"
                        placeholder="Alamat singkat..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isSaving}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" disabled={isSaving}>Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving || !name.trim()}>
                        {isSaving ? 'Menyimpan...' : 'Simpan Reseller'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  )
}

export function ResellerSelectionDialog({
  open,
  onOpenChange,
  resellers,
  onSelect,
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  resellers: Reseller[];
  onSelect: (reseller: Reseller) => void;
}) {
    const { addReseller, editReseller, deleteReseller } = useInventory();
    const { toast } = useToast();
    const [resellerToEdit, setResellerToEdit] = useState<Reseller | null>(null);
    const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);

    const handleAddReseller = async (resellerData: Omit<Reseller, 'id'>) => {
        try {
            await addReseller(resellerData.name, resellerData.phone, resellerData.address);
            toast({
                title: 'Reseller Ditambahkan',
                description: `Reseller "${resellerData.name}" berhasil ditambahkan.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Menambahkan',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
            });
            // Re-throw to keep the dialog open on failure
            throw error;
        }
    };
    
    const handleEditReseller = async (resellerData: Omit<Reseller, 'id'>) => {
        if (!resellerToEdit) return;
        try {
            await editReseller(resellerToEdit.id, resellerData);
            toast({
                title: 'Reseller Diperbarui',
                description: `Data untuk "${resellerData.name}" telah diperbarui.`,
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Gagal Memperbarui',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
            });
            throw error;
        }
    }

    const handleDeleteReseller = async () => {
        if (!resellerToDelete) return;
        try {
            await deleteReseller(resellerToDelete.id);
            toast({
                title: 'Reseller Dihapus',
                description: `Reseller "${resellerToDelete.name}" telah dihapus.`,
            });
            setResellerToDelete(null);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Gagal Menghapus',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
            });
        }
    }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pilih Reseller</DialogTitle>
          <DialogDescription>
            Pilih reseller dari daftar di bawah, atau tambahkan reseller baru.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
           <ResellerFormDialog onSave={handleAddReseller}>
             <Button variant="outline" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah Reseller Baru
            </Button>
           </ResellerFormDialog>
        </div>
        
        <ScrollArea className="h-80 border rounded-md mt-4">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. Telepon</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead className="w-[50px] text-center">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length > 0 ? (
                resellers.map((reseller) => (
                  <TableRow
                    key={reseller.id}
                    onClick={() => onSelect(reseller)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{reseller.name}</TableCell>
                    <TableCell>{reseller.phone || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{reseller.address || '-'}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <ResellerFormDialog onSave={handleEditReseller} reseller={resellerToEdit}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setResellerToEdit(reseller)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Ubah
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setResellerToDelete(reseller)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </ResellerFormDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada reseller. Tambahkan di atas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <AlertDialog open={!!resellerToDelete} onOpenChange={(isOpen) => !isOpen && setResellerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus reseller ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat diurungkan. Ini akan menghapus reseller "{resellerToDelete?.name}" secara permanen.
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

      </DialogContent>
    </Dialog>
  );
}


'use client';

import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Reseller } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface ResellerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellers: Reseller[];
  onSelect: (reseller: Reseller) => void;
  onAddReseller: (name: string, phone?: string, address?: string) => Promise<void>;
}

function AddResellerDialog({ onAddReseller, children }: { onAddReseller: ResellerSelectionDialogProps['onAddReseller'], children: React.ReactNode }) {
  const [newResellerName, setNewResellerName] = useState('');
  const [newResellerPhone, setNewResellerPhone] = useState('');
  const [newResellerAddress, setNewResellerAddress] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleAddReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResellerName.trim()) return;

    setIsAdding(true);
    try {
      await onAddReseller(newResellerName.trim(), newResellerPhone.trim(), newResellerAddress.trim());
      toast({
        title: 'Reseller Ditambahkan',
        description: `Reseller "${newResellerName.trim()}" berhasil ditambahkan.`,
      });
      setNewResellerName('');
      setNewResellerPhone('');
      setNewResellerAddress('');
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menambahkan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            {children}
        </DialogTrigger>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>Tambah Reseller Baru</DialogTitle>
                <DialogDescription>
                    Masukkan detail reseller baru di bawah ini.
                </DialogDescription>
            </DialogHeader>
             <form onSubmit={handleAddReseller} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="reseller-name">Nama Reseller</Label>
                        <Input
                        id="reseller-name"
                        placeholder="Nama..."
                        value={newResellerName}
                        onChange={(e) => setNewResellerName(e.target.value)}
                        disabled={isAdding}
                        required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reseller-phone">No. Telepon</Label>
                        <Input
                        id="reseller-phone"
                        placeholder="0812..."
                        value={newResellerPhone}
                        onChange={(e) => setNewResellerPhone(e.target.value)}
                        disabled={isAdding}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reseller-address">Alamat</Label>
                    <Input
                    id="reseller-address"
                    placeholder="Alamat lengkap..."
                    value={newResellerAddress}
                    onChange={(e) => setNewResellerAddress(e.target.value)}
                    disabled={isAdding}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isAdding || !newResellerName.trim()}>
                        {isAdding ? 'Menambahkan...' : 'Simpan Reseller'}
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
  onAddReseller,
}: ResellerSelectionDialogProps) {

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
           <AddResellerDialog onAddReseller={onAddReseller}>
             <Button variant="outline" className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah Reseller Baru
            </Button>
           </AddResellerDialog>
        </div>
        
        <ScrollArea className="h-80 border rounded-md mt-4">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. Telepon</TableHead>
                    <TableHead>Alamat</TableHead>
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
                    <TableCell>{reseller.address || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Belum ada reseller. Tambahkan di atas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

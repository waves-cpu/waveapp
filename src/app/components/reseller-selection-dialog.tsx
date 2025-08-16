
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Reseller } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ResellerSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellers: Reseller[];
  onSelect: (reseller: Reseller) => void;
  onAddReseller: (name: string) => Promise<void>;
}

export function ResellerSelectionDialog({
  open,
  onOpenChange,
  resellers,
  onSelect,
  onAddReseller,
}: ResellerSelectionDialogProps) {
  const [newResellerName, setNewResellerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const handleAddReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResellerName.trim()) return;

    setIsAdding(true);
    try {
      await onAddReseller(newResellerName.trim());
      toast({
        title: 'Reseller Ditambahkan',
        description: `Reseller "${newResellerName.trim()}" berhasil ditambahkan.`,
      });
      setNewResellerName('');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pilih Reseller</DialogTitle>
          <DialogDescription>
            Pilih reseller dari daftar atau tambahkan yang baru.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 border rounded-md">
          <Table>
            <TableBody>
              {resellers.length > 0 ? (
                resellers.map((reseller) => (
                  <TableRow
                    key={reseller.id}
                    onClick={() => onSelect(reseller)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{reseller.name}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground">
                    Belum ada reseller.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <form onSubmit={handleAddReseller} className="flex gap-2 w-full">
            <Input
              placeholder="Nama reseller baru..."
              value={newResellerName}
              onChange={(e) => setNewResellerName(e.target.value)}
              disabled={isAdding}
            />
            <Button type="submit" disabled={isAdding || !newResellerName.trim()}>
              {isAdding ? 'Menambahkan...' : 'Tambah'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

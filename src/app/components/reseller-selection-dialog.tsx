
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { MoreVertical, UserPlus, Trash2, Pencil, Search } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

interface ResellerFormDialogProps {
  onSave: (resellerData: Omit<Reseller, 'id'>) => Promise<void>;
  reseller?: Reseller | null;
  children: React.ReactNode;
}

function ResellerFormDialog({ onSave, reseller, children }: ResellerFormDialogProps) {
  const { language } = useLanguage();
  const t = translations[language].reseller.dialog.form;
  const tCommon = translations[language].common;

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
                <DialogTitle>{isEditMode ? t.editTitle : t.addTitle}</DialogTitle>
                <DialogDescription>
                   {isEditMode ? t.editDescription : t.addDescription}
                </DialogDescription>
            </DialogHeader>
             <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="reseller-name">{t.nameLabel}</Label>
                    <Input
                    id="reseller-name"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                    required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="reseller-phone">{t.phoneLabel}</Label>
                        <Input
                        id="reseller-phone"
                        placeholder={t.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isSaving}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reseller-address">{t.addressLabel}</Label>
                        <Input
                        id="reseller-address"
                        placeholder={t.addressPlaceholder}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isSaving}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" disabled={isSaving}>{tCommon.cancel}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving || !name.trim()}>
                        {isSaving ? tCommon.saveChanges + '...' : t.save}
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
    const { language } = useLanguage();
    const t = translations[language];
    const TResellerDialog = t.reseller.dialog;
    const [resellerToEdit, setResellerToEdit] = useState<Reseller | null>(null);
    const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResellers = useMemo(() => {
        if (!searchTerm) return resellers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return resellers.filter(reseller => 
            reseller.name.toLowerCase().includes(lowercasedFilter) ||
            reseller.phone?.toLowerCase().includes(lowercasedFilter) ||
            reseller.address?.toLowerCase().includes(lowercasedFilter)
        );
    }, [resellers, searchTerm]);

    const handleAddReseller = async (resellerData: Omit<Reseller, 'id'>) => {
        try {
            await addReseller(resellerData.name, resellerData.phone, resellerData.address);
            toast({
                title: TResellerDialog.addedToast,
                description: TResellerDialog.addedToastDesc.replace('{name}', resellerData.name),
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: TResellerDialog.addErrorToast,
                description: error instanceof Error ? error.message : 'An error occurred.',
            });
            throw error;
        }
    };
    
    const handleEditReseller = async (resellerData: Omit<Reseller, 'id'>) => {
        if (!resellerToEdit) return;
        try {
            await editReseller(resellerToEdit.id, resellerData);
            toast({
                title: TResellerDialog.updatedToast,
                description: TResellerDialog.updatedToastDesc.replace('{name}', resellerData.name),
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: TResellerDialog.updateErrorToast,
                description: error instanceof Error ? error.message : 'An error occurred.',
            });
            throw error;
        }
    }

    const handleDeleteReseller = async () => {
        if (!resellerToDelete) return;
        try {
            await deleteReseller(resellerToDelete.id);
            toast({
                title: TResellerDialog.deletedToast,
                description: TResellerDialog.deletedToastDesc.replace('{name}', resellerToDelete.name),
            });
            setResellerToDelete(null);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: TResellerDialog.deleteErrorToast,
                description: error instanceof Error ? error.message : 'An error occurred.',
            });
        }
    }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{TResellerDialog.title}</DialogTitle>
          <DialogDescription>
            {TResellerDialog.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 pt-4">
           <ResellerFormDialog onSave={handleAddReseller}>
             <Button variant="outline" className="w-full md:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                {TResellerDialog.addNew}
            </Button>
           </ResellerFormDialog>
           <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={TResellerDialog.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
           </div>
        </div>
        
        <ScrollArea className="h-80 border rounded-md">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{TResellerDialog.table.name}</TableHead>
                    <TableHead>{TResellerDialog.table.phone}</TableHead>
                    <TableHead>{TResellerDialog.table.address}</TableHead>
                    <TableHead className="w-[50px] text-center">{TResellerDialog.table.actions}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResellers.length > 0 ? (
                filteredResellers.map((reseller) => (
                  <TableRow
                    key={reseller.id}
                    onClick={() => onSelect(reseller)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{reseller.name}</TableCell>
                    <TableCell>{reseller.phone || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{reseller.address || '-'}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <ResellerFormDialog onSave={handleEditReseller} reseller={reseller}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setResellerToEdit(reseller)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t.inventoryTable.editProduct}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setResellerToDelete(reseller)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
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
                    {searchTerm ? TResellerDialog.notFound : TResellerDialog.none}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <AlertDialog open={!!resellerToDelete} onOpenChange={(isOpen) => !isOpen && setResellerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{TResellerDialog.deleteDialog.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {TResellerDialog.deleteDialog.description.replace('{name}', resellerToDelete?.name || '')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteReseller} className="bg-destructive hover:bg-destructive/90">
                        {TResellerDialog.deleteDialog.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
}

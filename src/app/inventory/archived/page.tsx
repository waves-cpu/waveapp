
'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArchiveRestore, ArchiveX, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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

export default function ArchivedProductsPage() {
  const { items, archiveProduct, loading, deleteProductPermanently } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  const TArchived = t.archived;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const archivedItems = useMemo(() => {
    return items
        .filter(item => item.isArchived)
        .filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        );
  }, [items, searchTerm]);

  const handleUnarchive = async (itemId: string) => {
    try {
        await archiveProduct(itemId, false);
        toast({
            title: TArchived.unarchiveSuccessTitle,
            description: TArchived.unarchiveSuccessDesc,
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: TArchived.unarchiveErrorTitle,
            description: TArchived.unarchiveErrorDesc,
        })
    }
  }

  const handleDelete = async (itemId: string, itemName: string) => {
    try {
        await deleteProductPermanently(itemId);
        toast({
            title: TArchived.deleteSuccessTitle,
            description: TArchived.deleteSuccessDesc.replace('{name}', itemName),
        })
    } catch(error) {
         toast({
            variant: 'destructive',
            title: TArchived.deleteErrorTitle,
            description: TArchived.deleteErrorDesc,
        })
    }
  }

  return (
    <AppLayout>
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
              {TArchived.title}
            </h1>
          </div>
          <div className="w-full max-w-sm">
            <Input 
                placeholder={TArchived.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-card rounded-lg border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%]">{TArchived.table.product}</TableHead>
                        <TableHead>{TArchived.table.category}</TableHead>
                        <TableHead className="text-center">{TArchived.table.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">{TArchived.loading}</TableCell>
                        </TableRow>
                    ) : archivedItems.length > 0 ? (
                        archivedItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <Image 
                                            src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                            alt={item.name} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="outline" size="sm" onClick={() => handleUnarchive(item.id)}>
                                        <ArchiveRestore className="mr-2 h-4 w-4" />
                                        {TArchived.unarchiveButton}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" size="sm" className="ml-2">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {TArchived.deleteButton}
                                             </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{TArchived.deleteDialogTitle}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {TArchived.deleteDialogDesc.replace('{name}', item.name)}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(item.id, item.name)} className="bg-destructive hover:bg-destructive/90">
                                                    {TArchived.deleteDialogConfirm}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-48 text-center">
                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <ArchiveX className="h-16 w-16" />
                                    <p className="font-semibold">{TArchived.empty}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </main>
    </AppLayout>
  );
}

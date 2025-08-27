
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
import { ArchiveRestore, ArchiveX, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function ArchivedProductsPage() {
  const { items, archiveProduct, loading } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
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
            title: "Produk Diaktifkan Kembali",
            description: "Produk telah berhasil dikembalikan ke daftar aktif.",
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: "Gagal Mengaktifkan Produk",
            description: "Terjadi kesalahan saat mengaktifkan kembali produk.",
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
              Produk yang Diarsipkan
            </h1>
          </div>
          <div className="w-full max-w-sm">
            <Input 
                placeholder="Cari produk di arsip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-card rounded-lg border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%]">Produk</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">Memuat produk arsip...</TableCell>
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
                                        Aktifkan Kembali
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-48 text-center">
                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <ArchiveX className="h-16 w-16" />
                                    <p className="font-semibold">Tidak Ada Produk yang Diarsipkan</p>
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

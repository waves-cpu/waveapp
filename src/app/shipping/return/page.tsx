
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Search, Undo2, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const returnItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantitySold: z.number(),
  returnQuantity: z.coerce.number().int().min(0, "Jumlah harus non-negatif."),
  reason: z.string().optional(),
}).refine(data => data.returnQuantity <= data.quantitySold, {
    message: "Jumlah return tidak bisa melebihi jumlah terjual.",
    path: ["returnQuantity"],
});

const returnFormSchema = z.object({
  transactionId: z.string(),
  items: z.array(returnItemSchema).min(1, "Harus ada setidaknya satu item untuk direturn."),
});


interface ReturnProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    transactionId: string;
    items: Sale[];
  } | null;
}

function ReturnProcessingDialog({ open, onOpenChange, transaction }: ReturnProcessingDialogProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const { updateStock } = useInventory();

    const form = useForm<z.infer<typeof returnFormSchema>>({
        resolver: zodResolver(returnFormSchema),
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "items"
    });

    React.useEffect(() => {
        if (transaction) {
            form.reset({
                transactionId: transaction.transactionId,
                items: transaction.items.map(item => ({
                    id: item.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    name: item.productName + (item.variantName ? ` - ${item.variantName}` : ''),
                    sku: item.sku,
                    quantitySold: item.quantity,
                    returnQuantity: 0,
                    reason: `Return dari transaksi #${transaction.transactionId.slice(-6)}`,
                }))
            })
        }
    }, [transaction, form]);

    const onSubmit = async (values: z.infer<typeof returnFormSchema>) => {
        try {
            const updates = values.items
                .filter(item => item.returnQuantity > 0)
                .map(item => {
                    const idToUpdate = item.variantId || item.productId;
                    return updateStock(idToUpdate, item.returnQuantity, item.reason || 'Customer Return');
                });
            
            if(updates.length === 0) {
                toast({ variant: 'destructive', title: "Tidak ada item dipilih", description: "Masukkan jumlah item yang akan diretur." });
                return;
            }

            await Promise.all(updates);

            toast({
                title: "Return Berhasil Diproses",
                description: `${updates.length} jenis item telah dikembalikan ke stok.`,
            });
            onOpenChange(false);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Gagal Memproses Return",
                description: "Terjadi kesalahan saat mengembalikan stok.",
            });
        }
    };


    if (!transaction) return null;

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Proses Return Barang</DialogTitle>
                    <DialogDescription>
                        Masukkan jumlah barang yang dikembalikan ke stok untuk transaksi #{transaction.transactionId.slice(-6)}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Produk</TableHead>
                                    <TableHead>Terjual</TableHead>
                                    <TableHead>Diretur</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <p className="font-medium text-sm">{field.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {field.sku}</p>
                                        </TableCell>
                                        <TableCell>
                                            {field.quantitySold}
                                        </TableCell>
                                        <TableCell>
                                             <FormField
                                                control={form.control}
                                                name={`items.${index}.returnQuantity`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input type="number" {...formField} className="w-20 h-8" />
                                                        </FormControl>
                                                        <FormMessage className="text-xs"/>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                         <DialogFooter className="pt-6">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                            <Button type="submit">Proses Return</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
         </Dialog>
    )

}

export default function ReturnPage() {
  const { language } = useLanguage();
  const t = translations[language];
  const { allSales, loading } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{transactionId: string, items: Sale[]} | null>(null);

  const groupedSales = useMemo(() => {
    const groups: { [key: string]: Sale[] } = {};
    allSales.forEach(sale => {
        const id = sale.transactionId || `sale-${sale.id}`;
        if (!groups[id]) {
            groups[id] = [];
        }
        groups[id].push(sale);
    });
    return Object.entries(groups).map(([transactionId, items]) => ({
        transactionId,
        items,
        date: new Date(items[0].saleDate),
        resellerName: items[0].resellerName,
        channel: items[0].channel,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    })).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [allSales]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return groupedSales;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return groupedSales.filter(group => 
        group.transactionId.toLowerCase().includes(lowerSearchTerm) ||
        group.resellerName?.toLowerCase().includes(lowerSearchTerm) ||
        group.items.some(item => item.sku?.toLowerCase().includes(lowerSearchTerm) || item.productName.toLowerCase().includes(lowerSearchTerm))
    );
  }, [groupedSales, searchTerm]);
  
  const handleProcessReturn = (transactionId: string, items: Sale[]) => {
    setSelectedTransaction({ transactionId, items });
    setIsDialogOpen(true);
  };

  return (
    <>
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{t.shipping.return}</h1>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Cari Transaksi untuk Diretur</CardTitle>
                <CardDescription>Cari berdasarkan ID Transaksi, nama produk, SKU, atau nama reseller.</CardDescription>
                <div className="relative pt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari transaksi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-1/2"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px]">Tanggal</TableHead>
                                <TableHead>Detail Transaksi</TableHead>
                                <TableHead className="text-center w-[150px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Memuat data transaksi...</TableCell></TableRow>
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.slice(0, 50).map(group => (
                                    <TableRow key={group.transactionId}>
                                        <TableCell>{format(group.date, 'd MMM yyyy, HH:mm')}</TableCell>
                                        <TableCell>
                                            <p className="font-mono text-xs">ID: {group.transactionId.slice(-10)}</p>
                                            <p className="font-medium">{group.totalItems} item dari kanal {group.channel}</p>
                                            {group.resellerName && <p className="text-sm text-muted-foreground">Reseller: {group.resellerName}</p>}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="outline" size="sm" onClick={() => handleProcessReturn(group.transactionId, group.items)}>
                                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                                Proses Return
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-48">
                                         <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <Search className="h-16 w-16" />
                                            <p className="font-semibold">Transaksi Tidak Ditemukan</p>
                                            <p className="text-sm">Coba kata kunci pencarian yang lain.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {filteredTransactions.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">Hanya 50 transaksi terbaru yang ditampilkan. Gunakan pencarian untuk hasil yang lebih spesifik.</p>
                )}
            </CardContent>
        </Card>
      </main>
    </AppLayout>

    <ReturnProcessingDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transaction={selectedTransaction}
    />
    </>
  );
}


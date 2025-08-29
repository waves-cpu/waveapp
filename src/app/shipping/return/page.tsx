
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Undo2, Truck, CheckCircle, XCircle, Package, Trash2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { updateShippingReceiptStatus } from '@/lib/inventory-service';
import type { ShippingReceipt, InventoryItem, InventoryItemVariant } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { useInventory } from '@/hooks/use-inventory';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScanSounds } from '@/hooks/use-scan-sounds';


const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'default';
        case 'dikirim':
        case 'diantar': return 'secondary';
        case 'return':
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

const ReturnProductDialog = ({
    open,
    onOpenChange,
    onProductSelected
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductSelected: (variant: InventoryItemVariant) => void;
}) => {
    const { items, getProductBySku } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
    const { playErrorSound } = useScanSounds();
    const { toast } = useToast();
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            setFilteredItems([]);
            setProductForVariantSelection(null);
        }
    }, [open]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) {
            setFilteredItems(items.filter(i => i.variants && i.variants.length > 0));
            return;
        }

        const product = await getProductBySku(searchTerm);
        if (product) {
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else if (product.variants && product.variants.length === 1) {
                onProductSelected(product.variants[0]);
            } else {
                 toast({ variant: "destructive", title: "Produk Tunggal", description: "Produk ini tidak memiliki varian untuk dipilih." });
            }
        } else {
            const searchResults = items.filter(i => 
                i.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                i.variants && i.variants.length > 0
            );
            setFilteredItems(searchResults);
             if (searchResults.length === 0) {
                 playErrorSound();
                 toast({ variant: "destructive", title: "Produk Tidak Ditemukan" });
            }
        }
    };

    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        setProductForVariantSelection(null);
        if(variant) {
            onProductSelected(variant);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pilih Produk yang Dikembalikan</DialogTitle>
                        <DialogDescription>Cari berdasarkan SKU atau nama produk untuk menemukan item yang dikembalikan.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <Input
                            placeholder="Masukkan SKU atau Nama Produk..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button type="submit">
                            <Search className="mr-2 h-4 w-4" />
                            Cari
                        </Button>
                    </form>
                    <ScrollArea className="h-72 border rounded-md">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead>Varian</TableHead>
                                    <TableHead className="text-center">Stok</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.flatMap(item =>
                                    item.variants?.map(variant => (
                                        <TableRow key={variant.id} onClick={() => onProductSelected(variant)} className="cursor-pointer">
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{variant.name}</TableCell>
                                            <TableCell className="text-center">{variant.stock}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                         {filteredItems.length === 0 && !productForVariantSelection && (
                             <p className="p-4 text-center text-sm text-muted-foreground">Mulai pencarian untuk melihat produk.</p>
                         )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            {productForVariantSelection && (
                 <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => !isOpen && setProductForVariantSelection(null)}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelect}
                    cart={[]}
                    ignoreStockCheck={true}
                />
            )}
        </>
    );
};


export default function ReturnPage() {
    const [returns, setReturns] = useState<ShippingReceipt[]>([]);
    const [totalReturns, setTotalReturns] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const { toast } = useToast();
    const { items, updateStock, fetchShippingReceipts, deleteShippingReceipt } = useInventory();
    const { language } = useLanguage();
    const t = translations[language].shipping.returnPage;
    const tCommon = translations[language].common;
    
    const [selectedReceipt, setSelectedReceipt] = useState<ShippingReceipt | null>(null);
    const [receiptToDelete, setReceiptToDelete] = useState<ShippingReceipt | null>(null);
    const [isProductSelectionDialogOpen, setIsProductSelectionDialogOpen] = useState(false);


    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const { receipts, total } = await fetchShippingReceipts({
                page: currentPage,
                limit: itemsPerPage,
                status: ['Return', 'Dibatalkan', 'Diantar', 'Tidak Sampai']
            });
            setReturns(receipts);
            setTotalReturns(total);
        } catch (error) {
            console.error("Failed to fetch return receipts:", error);
            toast({ variant: 'destructive', title: t.fetchError });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, toast, t.fetchError, fetchShippingReceipts]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);
    
    const totalPages = Math.ceil(totalReturns / itemsPerPage);

    const handleChangeStatus = async (id: number, newStatus: string) => {
        try {
            await updateShippingReceiptStatus(id, newStatus);
            toast({ title: t.statusUpdateSuccess, description: t.statusUpdateSuccessDesc.replace('{status}', newStatus) });
            fetchReturns();
        } catch (error) {
            console.error(`Failed to change status to ${newStatus}:`, error);
            toast({ variant: 'destructive', title: t.statusUpdateError });
        }
    };
    
    const handleDelete = async () => {
        if (!receiptToDelete) return;
        try {
            await deleteShippingReceipt(receiptToDelete.id);
            toast({ title: t.deleteSuccess, description: t.deleteSuccessDesc.replace('{awb}', receiptToDelete.awb) });
            setReceiptToDelete(null);
            fetchReturns(); // Refresh data
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            toast({ variant: 'destructive', title: t.deleteError });
        }
    };

    const handleReturnReceived = (receipt: ShippingReceipt) => {
        setSelectedReceipt(receipt);
        setIsProductSelectionDialogOpen(true);
    };
    
    const handleVariantReturned = async (variant: InventoryItemVariant) => {
        setIsProductSelectionDialogOpen(false);
        if (variant && selectedReceipt) {
            try {
                // Return 1 item to stock
                await updateStock(variant.id, 1, `Return dari resi ${selectedReceipt.awb}`);
                // Mark receipt as 'Selesai'
                await handleChangeStatus(selectedReceipt.id, 'Selesai');
                toast({ title: t.stockReturnedSuccess, description: t.stockReturnedSuccessDesc.replace('{name}', variant.name) });
            } catch (error) {
                toast({ variant: 'destructive', title: t.stockReturnedError });
            }
        }
        setSelectedReceipt(null);
    };

    return (
        <AppLayout>
            <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                           {t.title}
                        </h1>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.table.awb}</TableHead>
                                        <TableHead>{t.table.date}</TableHead>
                                        <TableHead>{t.table.channel}</TableHead>
                                        <TableHead>{t.table.status}</TableHead>
                                        <TableHead className="text-center">{t.table.actions}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="h-48 text-center">{t.loading}</TableCell></TableRow>
                                    ) : returns.length > 0 ? returns.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.awb}</TableCell>
                                            <TableCell>{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{item.channel}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <Undo2 className="mr-2 h-3 w-3" />
                                                            {t.actions.process}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleReturnReceived(item)}>
                                                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                            <span>{t.actions.itemArrived}</span>
                                                        </DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Diantar')}>
                                                            <Truck className="mr-2 h-4 w-4" />
                                                            <span>{t.actions.itemInTransit}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleChangeStatus(item.id, 'Tidak Sampai')} className="text-destructive">
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            <span>{t.actions.itemNotArrived}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                                     <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>{t.actions.delete}</span>
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t.deleteConfirmDesc.replace('{awb}', item.awb)}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setReceiptToDelete(null)}>{tCommon.cancel}</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => {setReceiptToDelete(item); handleDelete();}} className="bg-destructive hover:bg-destructive/90">
                                                                        {t.deleteConfirmAction}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <Package className="h-16 w-16" />
                                                    <p className="font-semibold">{t.noReturnsTitle}</p>
                                                    <p className="text-sm">{t.noReturnsDesc}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         {totalPages > 1 && (
                            <div className="flex items-center justify-end p-4 border-t">
                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </Card>
                </div>
            </main>
            <ReturnProductDialog
                open={isProductSelectionDialogOpen}
                onOpenChange={setIsProductSelectionDialogOpen}
                onProductSelected={handleVariantReturned}
            />
        </AppLayout>
    );
}


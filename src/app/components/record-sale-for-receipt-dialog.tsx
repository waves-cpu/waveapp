
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Trash2, X } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import type { ShippingReceipt, InventoryItem, InventoryItemVariant } from '@/types';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Image from 'next/image';
import { useDebounce } from '@/hooks/use-debounce';


type SaleItem = {
    sku: string;
    name: string;
    quantity: number;
};

interface RecordSaleForReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    receipt: ShippingReceipt | null;
}

export function RecordSaleForReceiptDialog({
    open,
    onOpenChange,
    receipt,
}: RecordSaleForReceiptDialogProps) {
    const { getProductBySku, recordSale, items: inventoryItems } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const { toast } = useToast();
    const inputRef = React.useRef<HTMLInputElement>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    const searchSuggestions = useMemo(() => {
        if (debouncedSearchTerm.length < 2) return [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        
        const skuMatch = inventoryItems.find(item => 
            item.sku?.toLowerCase() === lowercasedTerm || 
            item.variants?.some(v => v.sku?.toLowerCase() === lowercasedTerm)
        );
        if (skuMatch) return [skuMatch];
        
        return inventoryItems.filter(item => 
            item.name.toLowerCase().includes(lowercasedTerm) && !item.isArchived
        ).slice(0, 10);

    }, [debouncedSearchTerm, inventoryItems]);

     useEffect(() => {
        setIsPopoverOpen(searchTerm.length >= 2 && searchSuggestions.length > 0);
    }, [searchTerm, searchSuggestions]);

    useEffect(() => {
        if (open) {
            setSaleItems([]);
            setSearchTerm('');
            setIsSubmitting(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const addOrUpdateSaleItem = useCallback((variant: InventoryItemVariant, parentName?: string) => {
        if (!variant.sku) {
            playErrorSound();
            toast({ variant: "destructive", title: "SKU Tidak Ada", description: "Varian ini tidak memiliki SKU." });
            return;
        }

        setSaleItems(prevItems => {
            const existingItem = prevItems.find(item => item.sku === variant.sku);
            if (existingItem) {
                return prevItems.map(item =>
                    item.sku === variant.sku ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { sku: variant.sku!, name: `${parentName} - ${variant.name}`, quantity: 1 }];
        });
        playSuccessSound();
        setSearchTerm('');
    }, [playErrorSound, playSuccessSound, toast]);

    const handleProductSelect = useCallback(async (product: InventoryItem) => {
        setIsPopoverOpen(false);
        setSearchTerm('');
        try {
            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else {
                const itemToAdd = (product.variants && product.variants.length === 1) ? product.variants[0] : product;
                if (!itemToAdd.sku) throw new Error("Produk ini tidak memiliki SKU.");
                
                const stock = (itemToAdd as InventoryItemVariant).stock ?? (itemToAdd as InventoryItem).stock;
                if (stock !== undefined && stock <= 0) {
                     throw new Error(`Stok untuk produk "${itemToAdd.name}" sudah habis.`);
                }
                addOrUpdateSaleItem(itemToAdd as InventoryItemVariant, product.name);
            }
        } catch (error: any) {
            playErrorSound();
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }, [addOrUpdateSaleItem, playErrorSound, toast]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        
        // If there's a single exact match suggestion, select it.
        if (searchSuggestions.length === 1 && (searchSuggestions[0].sku?.toLowerCase() === searchTerm.toLowerCase() || searchSuggestions[0].variants?.some(v => v.sku?.toLowerCase() === searchTerm.toLowerCase()))) {
            handleProductSelect(searchSuggestions[0]);
            return;
        }

        // Fallback to original SKU search logic for scanner input
        try {
            const product = await getProductBySku(searchTerm);
            if (product) {
                handleProductSelect(product);
            } else {
                 throw new Error("Produk tidak ditemukan.");
            }
        } catch(error: any) {
             playErrorSound();
             toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setSearchTerm('');
            inputRef.current?.focus();
        }
    };
    

    const handleVariantSelectFromDialog = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addOrUpdateSaleItem(variant, productForVariantSelection.name);
        }
        setProductForVariantSelection(null);
        inputRef.current?.focus();
    };

    const updateQuantity = (sku: string, newQuantity: number) => {
        setSaleItems(prevItems => {
            if (newQuantity <= 0) {
                return prevItems.filter(item => item.sku !== sku);
            }
            return prevItems.map(item => (item.sku === sku ? { ...item, quantity: newQuantity } : item));
        });
    };

    const removeItem = (sku: string) => {
        setSaleItems(prevItems => prevItems.filter(item => item.sku !== sku));
    };

    const handleFinalizeSale = async () => {
        if (saleItems.length === 0 || !receipt || !receipt.transactionId) return;
        setIsSubmitting(true);
        try {
            const salePromises = saleItems.map(item => 
                recordSale(item.sku, receipt.channel, item.quantity, { transactionId: receipt.transactionId, saleDate: new Date(receipt.date) })
            );
            await Promise.all(salePromises);
            
            toast({ title: 'Penjualan Berhasil', description: `Penjualan untuk resi ${receipt.awb} telah dicatat.` });
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menyelesaikan Penjualan', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Catat Penjualan untuk Resi</DialogTitle>
                        <DialogDescription>
                            Scan atau cari produk untuk resi: <span className="font-semibold">{receipt?.awb}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <form onSubmit={handleFormSubmit}>
                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            ref={inputRef}
                                            placeholder="Scan SKU atau cari nama produk, lalu Enter..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                            disabled={isSubmitting}
                                            autoComplete="off"
                                        />
                                         {searchTerm && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                                                onClick={() => setSearchTerm('')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                 <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                                    <ScrollArea className="max-h-72">
                                        <div className="flex flex-col gap-1 p-2">
                                        {searchSuggestions.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleProductSelect(item)}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left w-full"
                                            >
                                                <Image 
                                                    src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                                    alt={item.name} 
                                                    width={32} 
                                                    height={32} 
                                                    className="rounded-md"
                                                    data-ai-hint="product image"
                                                />
                                                <div>
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                                                </div>
                                            </button>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                        </form>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-64 border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produk</TableHead>
                                                <TableHead className="w-[120px] text-center">Jumlah</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {saleItems.length > 0 ? saleItems.map(item => (
                                                <TableRow key={item.sku}>
                                                    <TableCell>
                                                        <p className="font-medium text-sm">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => updateQuantity(item.sku, parseInt(e.target.value) || 0)}
                                                                className="w-20 h-8 text-center"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeItem(item.sku)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                                        Belum ada produk ditambahkan.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button onClick={handleFinalizeSale} disabled={saleItems.length === 0 || isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Penjualan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {productForVariantSelection && (
                 <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => !isOpen && setProductForVariantSelection(null)}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelectFromDialog}
                    cart={[]}
                    ignoreStockCheck={false}
                />
            )}
        </>
    );
}

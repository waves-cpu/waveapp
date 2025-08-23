
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useInventory } from '@/hooks/use-inventory';
import type { Sale, ShippingReceipt, ShippingStatus, InventoryItem, InventoryItemVariant } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScanLine } from 'lucide-react';
import { VariantSelectionDialog } from '@/app/components/variant-selection-dialog';
import { useScanSounds } from '@/hooks/use-scan-sounds';


interface ReturnProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ShippingReceipt | null;
}

export function ReturnProcessingDialog({ open, onOpenChange, receipt }: ReturnProcessingDialogProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { toast } = useToast();
    const { updateStock, updateShippingReceiptStatus, getProductBySku } = useInventory();
    const { playSuccessSound, playErrorSound } = useScanSounds();

    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [skuInput, setSkuInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);

    useEffect(() => {
        if (!open) {
            setReturnItems([]);
            setSkuInput('');
        }
    }, [open]);

    const handleSkuSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!skuInput.trim()) return;

        try {
            const product = await getProductBySku(skuInput.trim());
            if (!product) {
                playErrorSound();
                toast({ variant: 'destructive', title: "Produk tidak ditemukan" });
                return;
            }

            if (product.variants && product.variants.length > 1) {
                setProductForVariantSelection(product);
            } else {
                const itemToAdd = (product.variants && product.variants.length === 1) ? product.variants[0] : product;
                addItemToReturnList(product, itemToAdd as InventoryItemVariant);
            }
        } catch (error) {
            playErrorSound();
            toast({ variant: 'destructive', title: "Error", description: "Gagal mencari produk." });
        } finally {
            setSkuInput('');
        }
    };
    
    const addItemToReturnList = (parentProduct: InventoryItem, item: InventoryItemVariant) => {
        playSuccessSound();
        const existingItemIndex = returnItems.findIndex(ri => ri.id === item.id);
        if (existingItemIndex > -1) {
            const updatedItems = [...returnItems];
            updatedItems[existingItemIndex].returnQuantity += 1;
            setReturnItems(updatedItems);
        } else {
            setReturnItems(prev => [...prev, {
                id: item.id,
                productId: parentProduct.id,
                variantId: (item as any).productId ? item.id : undefined,
                name: (item as any).productId ? `${parentProduct.name} - ${item.name}`: parentProduct.name,
                sku: item.sku,
                imageUrl: parentProduct.imageUrl,
                returnQuantity: 1,
            }]);
        }
    };

    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addItemToReturnList(productForVariantSelection, variant);
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        const qty = Math.max(0, newQuantity);
        setReturnItems(items => items.map(item => item.id === itemId ? { ...item, returnQuantity: qty } : item).filter(item => item.returnQuantity > 0));
    };

    const handleFinalizeReturn = async () => {
        if (!receipt || returnItems.length === 0) return;
        setIsSubmitting(true);
        try {
            const stockUpdates = returnItems.map(item => 
                updateStock(item.id, item.returnQuantity, `Return dari resi #${receipt.receiptNumber}`)
            );
            await Promise.all(stockUpdates);
            await updateShippingReceiptStatus(receipt.id, 'reconciled');
            
            toast({
                title: "Return Berhasil Diproses",
                description: `${returnItems.length} jenis item telah dikembalikan ke stok.`,
            });
            onOpenChange(false);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Memproses Return",
                description: "Terjadi kesalahan saat mengembalikan stok.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!receipt) return null;

    return (
        <>
         <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setProductForVariantSelection(null); onOpenChange(isOpen);}}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Proses Barang Return (Resi: {receipt.receiptNumber})</DialogTitle>
                    <DialogDescription>
                        Scan SKU produk yang ada di dalam paket retur untuk menambahkannya ke daftar.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSkuSubmit} className="pt-4">
                    <Input
                        placeholder="Scan atau masukkan SKU..."
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        autoFocus
                    />
                </form>
                <div className="mt-4 border rounded-md max-h-80 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Produk</TableHead>
                                <TableHead className="text-center">Jumlah Diretur</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returnItems.length > 0 ? returnItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={item.returnQuantity} 
                                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                                            className="w-20 mx-auto text-center"
                                        />
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Scan produk untuk memulai...</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter className="pt-6">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleFinalizeReturn} disabled={isSubmitting || returnItems.length === 0}>
                        {isSubmitting ? 'Memproses...' : 'Tandai Selesai & Stok Masuk'}
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
         {productForVariantSelection && (
             <VariantSelectionDialog
                open={!!productForVariantSelection}
                onOpenChange={() => setProductForVariantSelection(null)}
                item={productForVariantSelection}
                onSelect={handleVariantSelect}
                cart={[]}
                ignoreStockCheck={true}
            />
         )}
        </>
    )
}

    
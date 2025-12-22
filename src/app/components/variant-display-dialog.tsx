

'use client';

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
  TableHeader,
  TableHead
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import Image from 'next/image';

interface VariantPerformance {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    assetValue?: number;
    unitsSold?: number;
}


interface VariantDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
      id: string;
      name: string;
      imageUrl?: string;
      sku?: string;
      category: string;
      variants: VariantPerformance[];
  };
  onEditStock: () => void;
}

const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};


export function VariantDisplayDialog({ open, onOpenChange, item, onEditStock }: VariantDisplayDialogProps) {

  const hasPerformanceData = item.variants.some(v => v.unitsSold !== undefined || v.assetValue !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
              <Image 
                  src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                  alt={item.name} 
                  width={40} 
                  height={40} 
                  className="rounded-md shrink-0"
                  data-ai-hint="product image"
              />
              <div className="pt-1">
                  <DialogTitle>{item.name}</DialogTitle>
                  {item.sku && <DialogDescription>SKU Induk: {item.sku}</DialogDescription>}
              </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-80 border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Varian</TableHead>
                        <TableHead className="text-center">Stok</TableHead>
                        {hasPerformanceData && <TableHead className="text-center">Terjual</TableHead>}
                        {hasPerformanceData && <TableHead className="text-right">Nilai Aset</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(item.variants || []).map(variant => (
                        <TableRow key={variant.id}>
                            <TableCell>
                                <div className="font-medium text-sm">{variant.name}</div>
                                <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{variant.stock}</TableCell>
                            {hasPerformanceData && <TableCell className="text-center font-semibold">{variant.unitsSold}</TableCell>}
                            {hasPerformanceData && <TableCell className="text-right">{formatCurrency(variant.assetValue)}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
        <DialogFooter>
            <Button variant="outline" onClick={onEditStock}>
                <Edit className="mr-2 h-4 w-4" />
                Atur Stok Varian
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


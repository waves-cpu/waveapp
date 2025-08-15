
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';


interface VariantSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  onSelect: (sku: string | null) => void;
}

export function VariantSelectionDialog({ open, onOpenChange, item, onSelect }: VariantSelectionDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  useEffect(() => {
    if (!open) {
        onSelect(null);
    }
  }, [open, onSelect]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.variantSelectionDialog.title}</DialogTitle>
          <DialogDescription>
            {t.variantSelectionDialog.description}
          </DialogDescription>
        </DialogHeader>
        <div className="-mt-2">
            <h4 className="font-medium text-lg leading-tight">{item.name}</h4>
            {item.sku && <p className="text-sm text-muted-foreground">SKU Induk: {item.sku}</p>}
        </div>
        <ScrollArea className="max-h-80 border-t pt-4">
            <Table>
                <TableBody>
                    {(item.variants || []).map(variant => (
                        <TableRow key={variant.id} onClick={() => onSelect(variant.sku || '')} className="cursor-pointer">
                            <TableCell>
                                <div className="font-medium">{variant.name}</div>
                                <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                            </TableCell>
                            <TableCell className="text-right">
                                {variant.stock > 0 ? (
                                    <Badge variant="outline">Stok: {variant.stock}</Badge>
                                ) : (
                                    <Badge variant="destructive">Stok Habis</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

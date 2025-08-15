'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Edit,
  History,
  FileDown,
  Search,
  Pencil,
  Plus,
} from 'lucide-react';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { BulkEditVariantsDialog } from './bulk-edit-variants-dialog';

interface InventoryTableProps {
  onUpdateStock: (itemId: string) => void;
  onShowHistory: (itemId: string) => void;
}

export function InventoryTable({ onUpdateStock, onShowHistory }: InventoryTableProps) {
  const { items, categories } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = translations[language];
  const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [selectedBulkEditItem, setSelectedBulkEditItem] = useState<InventoryItem | null>(null);

  const handleBulkEdit = (item: InventoryItem) => {
    setSelectedBulkEditItem(item);
    setBulkEditDialogOpen(true);
  };

  const filteredItems = useMemo(() => {
    return items
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variants?.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [items, categoryFilter, searchTerm]);

  const downloadCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Is Parent'];
    const rows: string[] = [];
    
    filteredItems.forEach(item => {
      if (item.variants && item.variants.length > 0) {
        rows.push([item.id, `"${item.name}"`, item.sku || '', item.category, '', '', 'TRUE'].join(','));
        item.variants.forEach(variant => {
          rows.push([variant.id, `"${variant.name}"`, variant.sku || '', item.category, variant.price, variant.stock, 'FALSE'].join(','));
        });
      } else {
        rows.push([item.id, `"${item.name}"`, item.sku || '', item.category, item.price, item.stock, 'FALSE'].join(','))
      }
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <>
    <div className="h-full flex flex-col bg-card rounded-lg border shadow-sm">
      <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.inventoryTable.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm" className="w-full md:w-auto">
          <FileDown className="mr-2 h-4 w-4" />
          {t.inventoryTable.exportCsv}
        </Button>
      </div>
      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="w-[40%]">{t.inventoryTable.name}</TableHead>
              <TableHead>{t.inventoryTable.price}</TableHead>
              <TableHead>{t.inventoryTable.currentStock}</TableHead>
              <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.flatMap((item) => {
                const totalStock = item.variants?.reduce((sum, v) => sum + v.stock, 0) ?? item.stock;

                if (item.variants && item.variants.length > 0) {
                    const prices = item.variants.map(v => v.price);
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const priceDisplay = minPrice === maxPrice 
                        ? `Rp${Math.round(minPrice)}`
                        : `Rp${Math.round(minPrice)} - Rp${Math.round(maxPrice)}`;

                    return (
                        <React.Fragment key={item.id}>
                            <TableRow className="bg-muted/20 hover:bg-muted/40">
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <Image 
                                            src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                            alt={item.name} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                        <div className="group relative">
                                            <button onClick={() => handleBulkEdit(item)} className="text-left">
                                                <div className="font-medium text-primary text-sm">{item.name}</div>
                                                <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                <div className="absolute -bottom-1 left-0 right-0 h-px bg-transparent transition-all group-hover:bg-primary"></div>
                                                <div className="absolute top-1/2 -right-6 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Pencil className="h-3 w-3" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{priceDisplay}</TableCell>
                                <TableCell>
                                    {totalStock}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button asChild variant="ghost" size="icon" aria-label={t.inventoryTable.editProduct}>
                                            <Link href={`/edit-product/${item.id}`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            {item.variants?.map((variant) => (
                                <TableRow key={variant.id}>
                                    <TableCell className="pl-16">
                                        <div className="font-medium text-sm">{variant.name}</div>
                                        <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                    </TableCell>
                                    <TableCell>{`Rp${Math.round(variant.price)}`}</TableCell>
                                    <TableCell>
                                        <div className="group relative flex items-center justify-start gap-2">
                                            <span>{variant.stock}</span>
                                            <Button variant="ghost" size="icon" onClick={() => onUpdateStock(variant.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t.inventoryTable.updateStock}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onShowHistory(variant.id)} aria-label={t.inventoryTable.viewHistory}>
                                                <History className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    )
                } else {
                    return (
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
                             <TableCell>{item.price ? `Rp${Math.round(item.price)}` : '-'}</TableCell>
                            <TableCell>
                                <div className="group relative flex items-center justify-start gap-2">
                                    <span>{item.stock}</span>
                                    <Button variant="ghost" size="icon" onClick={() => onUpdateStock(item.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t.inventoryTable.updateStock}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TableCell>
                             <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                     <Button asChild variant="ghost" size="icon" aria-label={t.inventoryTable.editProduct}>
                                        <Link href={`/edit-product/${item.id}`}>
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onShowHistory(item.id)} aria-label={t.inventoryTable.viewHistory}>
                                        <History className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                }
            })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {t.inventoryTable.noItems}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
    {selectedBulkEditItem && (
        <BulkEditVariantsDialog 
            open={isBulkEditDialogOpen}
            onOpenChange={setBulkEditDialogOpen}
            item={selectedBulkEditItem}
        />
    )}
    </>
  );
}

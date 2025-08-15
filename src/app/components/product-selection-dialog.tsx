
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selectedIds: string[]) => void;
  availableItems: InventoryItem[];
  categories: string[];
}

const ITEMS_PER_PAGE = 10;

export function ProductSelectionDialog({ open, onOpenChange, onSelect, availableItems, categories }: ProductSelectionDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    return availableItems
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variants?.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [availableItems, categoryFilter, searchTerm]);

  const { paginatedItems, selectableItemIdsOnPage } = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const selectableIds = paginated.flatMap(item => 
        item.variants && item.variants.length > 0 ? item.variants.map(v => v.id) : (item.stock !== undefined ? [item.id] : [])
    );
    return { paginatedItems: paginated, selectableItemIdsOnPage: selectableIds };
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  useEffect(() => {
      if(open) {
        setSelectedIds(new Set());
        setSearchTerm('');
        setCategoryFilter(null);
        setCurrentPage(1);
      }
  }, [open])

  const handleSelectAllOnPage = (checked: boolean | 'indeterminate') => {
    const newSelectedIds = new Set(selectedIds);
    if (checked === true) {
      selectableItemIdsOnPage.forEach(id => newSelectedIds.add(id));
    } else {
      selectableItemIdsOnPage.forEach(id => newSelectedIds.delete(id));
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSelectRow = (item: InventoryItem, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    const idsToToggle = item.variants ? item.variants.map(v => v.id) : [item.id];
    
    if (checked) {
      idsToToggle.forEach(id => newSelectedIds.add(id));
    } else {
      idsToToggle.forEach(id => newSelectedIds.delete(id));
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSave = () => {
    onSelect(Array.from(selectedIds));
    onOpenChange(false);
  };

  const isPageAllSelected = selectableItemIdsOnPage.length > 0 && selectableItemIdsOnPage.every(id => selectedIds.has(id));
  const isPagePartiallySelected = selectableItemIdsOnPage.some(id => selectedIds.has(id)) && !isPageAllSelected;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.dashboard.stockIn}</DialogTitle>
          <DialogDescription>
            {t.stockHistory.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4 px-0 py-4">
            <div className="relative w-full md:w-auto flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder={t.inventoryTable.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                className="pl-10 w-full"
                />
            </div>
            <Select onValueChange={(value) => {
                setCategoryFilter(value === 'all' ? null : value);
                setCurrentPage(1);
            }} defaultValue="all">
                <SelectTrigger className="w-full md:w-[200px]">
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
        <div className="flex-grow overflow-hidden border rounded-md relative">
           <ScrollArea className="absolute inset-0 h-full w-full">
            <div>
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                        <TableHead className="w-[60px]">
                        <Checkbox 
                            checked={isPageAllSelected ? true : (isPagePartiallySelected ? 'indeterminate' : false)}
                            onCheckedChange={handleSelectAllOnPage}
                            aria-label="Select all on this page"
                        />
                        </TableHead>
                        <TableHead>{t.inventoryTable.name}</TableHead>
                        <TableHead className="text-right">{t.inventoryTable.currentStock}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedItems.length > 0 ? (
                        paginatedItems.flatMap((item) => {
                            if (item.variants && item.variants.length > 0) {
                                const variantIds = item.variants.map(v => v.id);
                                const selectedCount = variantIds.filter(id => selectedIds.has(id)).length;
                                const isAllSelected = selectedCount === variantIds.length;
                                const isPartiallySelected = selectedCount > 0 && !isAllSelected;

                                return [
                                    <TableRow key={`product-${item.id}`} className="bg-muted/20 hover:bg-muted/40 font-semibold" data-state={isAllSelected ? "selected" : ""}>
                                        <TableCell>
                                             <Checkbox
                                                checked={isAllSelected ? true : (isPartiallySelected ? 'indeterminate' : false)}
                                                onCheckedChange={(checked) => handleSelectRow(item, !!checked)}
                                                aria-label={`Select ${item.name}`}
                                            />
                                        </TableCell>
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
                                                    <div className="font-medium text-primary text-sm">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>,
                                    ...item.variants.map(variant => (
                                        <TableRow key={`variant-${variant.id}`} data-state={selectedIds.has(variant.id) && "selected"}>
                                            <TableCell></TableCell>
                                            <TableCell className="pl-16">
                                                <div className="font-medium text-sm">{variant.name}</div>
                                                <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{variant.stock}</TableCell>
                                        </TableRow>
                                    ))
                                ];
                            }
                            return (
                                <TableRow key={`product-${item.id}`} data-state={selectedIds.has(item.id) && "selected"}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={(checked) => handleSelectRow(item, !!checked)}
                                            aria-label={`Select ${item.name}`}
                                            disabled={item.stock === undefined}
                                        />
                                    </TableCell>
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
                                    <TableCell className="text-right">{item.stock}</TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            {t.inventoryTable.noItems}
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                 <div className="flex items-center justify-between p-4 sticky bottom-0 bg-card/80 backdrop-blur-sm">
                    <div className="text-sm text-muted-foreground">
                        {selectedIds.size} item(s) selected.
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            </ScrollArea>
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button type="button" onClick={handleSave}>Add {selectedIds.size} Items</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 

    

    

    
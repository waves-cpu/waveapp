
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Store, Search } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';
import { Pagination } from '@/components/ui/pagination';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selectedIds: string[]) => void;
  availableItems: InventoryItem[];
  categories: string[];
  initialSelectedIds?: Set<string>;
  title: string;
  description: string;
}

const ITEMS_PER_PAGE = 10;

export function ProductSelectionDialog({ 
    open, 
    onOpenChange, 
    onSelect, 
    availableItems, 
    categories, 
    initialSelectedIds = new Set(),
    title, 
    description 
}: ProductSelectionDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelectedIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if(open) {
        setSelectedIds(new Set(initialSelectedIds));
        setSearchTerm('');
        setCategoryFilter(null);
        setCurrentPage(1);
        setItemsPerPage(ITEMS_PER_PAGE);
      }
  }, [open, initialSelectedIds])

  const filteredItems = useMemo(() => {
    return availableItems
      .filter(item => !initialSelectedIds.has(item.id) && (!item.variants || item.variants.every(v => !initialSelectedIds.has(v.id))))
      .filter((item) => (categoryFilter ? item.category === categoryFilter : true))
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variants?.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [availableItems, categoryFilter, searchTerm, initialSelectedIds]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const { paginatedItems, selectableItemIdsOnPage } = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filteredItems.slice(startIndex, startIndex + itemsPerPage);
    const selectableIds = paginated.flatMap(item => {
        if (item.variants && item.variants.length > 0) {
            return item.variants.map(v => v.id);
        }
        if (item.stock !== undefined) {
            return [item.id];
        }
        return [];
    }).filter(id => id);
    return { paginatedItems: paginated, selectableItemIdsOnPage: selectableIds };
  }, [filteredItems, currentPage, itemsPerPage]);

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
    const idsToToggle = (item.variants && item.variants.length > 0)
        ? item.variants.map(v => v.id)
        : (item.stock !== undefined ? [item.id] : []);
    
    if (checked) {
      idsToToggle.forEach(id => id && newSelectedIds.add(id));
    } else {
      idsToToggle.forEach(id => id && newSelectedIds.delete(id));
    }
    setSelectedIds(newSelectedIds);
  };
  
  const handleSelectVariant = (variantId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(variantId);
    } else {
      newSelectedIds.delete(variantId);
    }
    setSelectedIds(newSelectedIds);
  };


  const handleSave = () => {
    onSelect(Array.from(selectedIds));
    onOpenChange(false);
  };

  const isPageAllSelected = selectableItemIdsOnPage.length > 0 && selectableItemIdsOnPage.every(id => selectedIds.has(id));
  const isPagePartiallySelected = selectableItemIdsOnPage.some(id => selectedIds.has(id)) && !isPageAllSelected;

  const displayCount = useMemo(() => {
    if (selectedIds.size === 0) return 0;

    const variantToParentMap = new Map<string, string>();
    availableItems.forEach(item => {
        if (item.variants) {
            item.variants.forEach(variant => {
                variantToParentMap.set(variant.id, item.id);
            });
        }
    });

    const parentIds = new Set<string>();
    for (const selectedId of selectedIds) {
        const parentId = variantToParentMap.get(selectedId);
        if (parentId) {
            parentIds.add(parentId);
        } else {
            // Check if this ID is a simple product ID that exists in availableItems
            if (availableItems.some(item => item.id === selectedId && (!item.variants || item.variants.length === 0))) {
                parentIds.add(selectedId);
            }
        }
    }
    return parentIds.size;
  }, [selectedIds, availableItems]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4 px-0 py-4">
            <div className="relative w-full md:w-auto flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder={t.productSelectionDialog.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                className="pl-10 w-full"
                />
            </div>
            {categories.length > 0 && (
                <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                    <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder={t.productSelectionDialog.categoryPlaceholder} />
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
            )}
        </div>
        <div className="flex-grow flex flex-col overflow-hidden border rounded-md">
           <ScrollArea className="h-full" viewportRef={scrollViewportRef}>
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
                    <TableHead className="text-center">{t.inventoryTable.currentStock}</TableHead>
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
                                                <div className="font-medium text-sm text-primary">{item.name}</div>
                                                <div className="text-xs text-muted-foreground font-normal">SKU: {item.sku}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className='text-center'></TableCell>
                                </TableRow>,
                                ...item.variants.map(variant => (
                                    <TableRow key={`variant-${variant.id}`} data-state={selectedIds.has(variant.id) ? "selected" : ""}>
                                        <TableCell>
                                                <Checkbox
                                                checked={selectedIds.has(variant.id)}
                                                onCheckedChange={(checked) => handleSelectVariant(variant.id, !!checked)}
                                                aria-label={`Select ${variant.name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4 pl-8">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-sm"><Store className="h-5 w-5 text-gray-400" /></div>
                                                <div>
                                                    <div className="font-medium text-sm">{variant.name}</div>
                                                    <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{variant.stock}</TableCell>
                                    </TableRow>
                                ))
                            ];
                        }
                        return (
                            <TableRow key={`product-${item.id}`} data-state={selectedIds.has(item.id) ? "selected" : ""}>
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
                                <TableCell className="text-center">{item.stock}</TableCell>
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
            </ScrollArea>
        </div>
        <div className="flex-grow-0 pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center justify-start gap-2">
                 <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    scrollContainerRef={scrollViewportRef}
                />
                 <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                    }}
                    >
                    <SelectTrigger className="h-8 w-auto">
                        <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {`${pageSize} / ${t.productSelectionDialog.page}`}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="button" onClick={handleSave}>{t.productSelectionDialog.addItems.replace('{count}', displayCount.toString())}</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

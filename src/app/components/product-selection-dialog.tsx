
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

interface Product {
    id: string;
    name: string;
    category: string;
    stock: number;
    sku?: string;
}

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selectedIds: string[]) => void;
  allItems: Product[];
  categories: string[];
}

const ITEMS_PER_PAGE = 10;

export function ProductSelectionDialog({ open, onOpenChange, onSelect, allItems, categories }: ProductSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    return allItems
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [allItems, categoryFilter, searchTerm]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
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
    if (checked === true) {
      const newSelectedIds = new Set(selectedIds);
      paginatedItems.forEach(item => newSelectedIds.add(item.id));
      setSelectedIds(newSelectedIds);
    } else {
      const newSelectedIds = new Set(selectedIds);
      paginatedItems.forEach(item => newSelectedIds.delete(item.id));
      setSelectedIds(newSelectedIds);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSave = () => {
    onSelect(Array.from(selectedIds));
    onOpenChange(false);
  };

  const isPageAllSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));
  const isPagePartiallySelected = paginatedItems.some(item => selectedIds.has(item.id)) && !isPageAllSelected;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Products</DialogTitle>
          <DialogDescription>
            Choose products to add to the stock in list. You can search, filter, and select multiple items.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-auto flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search products..."
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
                    <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                        {category}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-grow overflow-hidden border rounded-md">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            <TableHead className="w-[50px]">
                            <Checkbox 
                                checked={isPageAllSelected ? true : (isPagePartiallySelected ? 'indeterminate' : false)}
                                onCheckedChange={handleSelectAllOnPage}
                                aria-label="Select all on this page"
                            />
                            </TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Current Stock</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paginatedItems.length > 0 ? (
                            paginatedItems.map((item) => (
                            <TableRow key={item.id} data-state={selectedIds.has(item.id) && "selected"}>
                                <TableCell>
                                <Checkbox
                                    checked={selectedIds.has(item.id)}
                                    onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                                    aria-label={`Select ${item.name}`}
                                />
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                                </TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell className="text-right">{item.stock}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No products found.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            <div className="flex items-center justify-between">
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
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Add {selectedIds.size} Items</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

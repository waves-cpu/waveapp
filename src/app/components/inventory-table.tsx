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
} from 'lucide-react';
import type { InventoryItem } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

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

  const filteredItems = useMemo(() => {
    return items
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [items, categoryFilter, searchTerm]);

  const downloadCSV = () => {
    const headers = ['ID', 'Name', 'Size', 'Category', 'Price', 'Stock'];
    const csvRows = [
      headers.join(','),
      ...filteredItems.map(item => 
        [item.id, `"${item.name}"`, item.size || '', item.category, item.price, item.stock].join(',')
      )
    ];
    const csvString = csvRows.join('\n');
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
              <TableHead>{t.inventoryTable.name}</TableHead>
              <TableHead>{t.inventoryTable.price}</TableHead>
              <TableHead className="text-right">{t.inventoryTable.currentStock}</TableHead>
              <TableHead className="text-center">{t.inventoryTable.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>{item.name}</div>
                    {item.size && <div className="text-xs text-muted-foreground">({item.size})</div>}
                  </TableCell>
                  <TableCell>{`$${item.price.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right">{item.stock}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onUpdateStock(item.id)} aria-label={t.inventoryTable.updateStock}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onShowHistory(item.id)} aria-label={t.inventoryTable.viewHistory}>
                            <History className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
  );
}

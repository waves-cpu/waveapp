
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

type HistoryEntry = AdjustmentHistory & {
    itemId: string;
    itemName: string;
    itemCategory: string;
    variantName?: string;
    itemSku?: string;
    variantSku?: string;
    imageUrl?: string;
};

export default function HistoryPage() {
  const { items, categories } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const allHistory = useMemo((): HistoryEntry[] => {
    const historyList: HistoryEntry[] = [];
    items.forEach(item => {
      if (item.variants && item.variants.length > 0) {
        item.variants.forEach(variant => {
          variant.history.forEach(entry => {
            historyList.push({
              ...entry,
              itemId: item.id,
              itemName: item.name,
              itemCategory: item.category,
              variantName: variant.name,
              itemSku: item.sku,
              variantSku: variant.sku,
              imageUrl: item.imageUrl,
            });
          });
        });
      } else if(item.history) {
        item.history.forEach(entry => {
          historyList.push({
            ...entry,
            itemId: item.id,
            itemName: item.name,
            itemCategory: item.category,
            itemSku: item.sku,
            imageUrl: item.imageUrl,
          });
        });
      }
    });
    return historyList.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items]);

  const filteredHistory = useMemo(() => {
    return allHistory
      .filter(entry => entry.change !== 0) // Exclude entries with zero change
      .filter(entry => 
        categoryFilter ? entry.itemCategory === categoryFilter : true
      )
      .filter(entry => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
            entry.itemName.toLowerCase().includes(lowerSearchTerm) ||
            (entry.variantName && entry.variantName.toLowerCase().includes(lowerSearchTerm)) ||
            entry.reason.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .filter(entry => {
          if (!dateRange || (!dateRange.from && !dateRange.to)) return true;
          const entryDate = new Date(entry.date);
          entryDate.setHours(0,0,0,0);
          if (dateRange.from && entryDate < dateRange.from) return false;
          if (dateRange.to) {
             const toDate = new Date(dateRange.to);
             toDate.setHours(23,59,59,999);
             if(entryDate > toDate) return false;
          }
          return true;
      });
  }, [allHistory, categoryFilter, searchTerm, dateRange]);

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
          {t.stockHistory.title}
        </h1>
      </div>
      <div className="bg-card rounded-lg border shadow-sm flex flex-col h-full">
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
            <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative w-full md:w-auto md:flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder={t.stockHistory.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                    />
                </div>
                <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
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
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full md:w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>{t.stockHistory.dateRange}</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        <div className="flex-grow overflow-auto">
            <Table>
            <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                <TableHead className="w-[35%]">{t.inventoryTable.name}</TableHead>
                <TableHead>{t.stockHistory.date}</TableHead>
                <TableHead>{t.stockHistory.reason}</TableHead>
                <TableHead className="text-right">{t.stockHistory.change}</TableHead>
                <TableHead className="text-right">{t.stockHistory.newTotal}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredHistory.length > 0 ? (
                filteredHistory.map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <Image 
                                    src={entry.imageUrl || 'https://placehold.co/40x40.png'} 
                                    alt={entry.itemName} 
                                    width={40} height={40} 
                                    className="rounded-sm" 
                                    data-ai-hint="product image"
                                />
                                <div>
                                    <div className="font-medium text-sm">{entry.itemName}</div>
                                    {entry.variantName && <div className="text-xs text-muted-foreground">{entry.variantName}</div>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell className="text-right">
                            <Badge variant={entry.change >= 0 ? 'default' : 'destructive'} className={cn(entry.change >= 0 ? 'bg-green-600' : 'bg-red-600', 'text-white')}>
                            {entry.change > 0 ? `+${entry.change}` : entry.change}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">{entry.newStockLevel}</TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    {t.inventoryTable.noItems}
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>
    </main>
  );
}

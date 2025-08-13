'use client';

import { useInventory } from '@/hooks/use-inventory';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { InventoryItem, InventoryItemVariant } from '@/types';

interface StockHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function StockHistorySheet({ open, onOpenChange, itemId }: StockHistorySheetProps) {
  const { getHistory, getItem } = useInventory();
  const { language } = useLanguage();
  const t = translations[language];
  
  const item = itemId ? getItem(itemId) : null;
  const history = itemId ? getHistory(itemId) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{t.stockHistory.title}: {item?.name}</SheetTitle>
          <SheetDescription>
            {t.stockHistory.description}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{t.stockHistory.date}</TableHead>
                    <TableHead>{t.stockHistory.reason}</TableHead>
                    <TableHead className="text-right">{t.stockHistory.change}</TableHead>
                    <TableHead className="text-right">{t.stockHistory.newTotal}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {history.length > 0 ? history.map((entry, index) => (
                    <TableRow key={index}>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.reason}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={entry.change > 0 ? 'default' : 'destructive'} className={entry.change > 0 ? 'bg-green-600' : 'bg-red-600'}>
                        {entry.change > 0 ? `+${entry.change}` : entry.change}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">{entry.newStockLevel}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">No history for this item.</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

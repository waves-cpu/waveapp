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

interface StockHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function StockHistorySheet({ open, onOpenChange, itemId }: StockHistorySheetProps) {
  const { getItem } = useInventory();
  
  const item = itemId ? getItem(itemId) : null;
  const history = item ? item.history : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Stock History: {item?.name}</SheetTitle>
          <SheetDescription>
            A log of all stock adjustments for this item.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">New Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {history.map((entry, index) => (
                    <TableRow key={index}>
                    <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                    <TableCell>{entry.reason}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={entry.change > 0 ? 'default' : 'destructive'} className={entry.change > 0 ? 'bg-green-600' : 'bg-red-600'}>
                        {entry.change > 0 ? `+${entry.change}` : entry.change}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">{entry.newStockLevel}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

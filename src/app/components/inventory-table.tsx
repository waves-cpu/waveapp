
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Pencil,
  PlusCircle,
  MoreVertical,
  Store,
  ShoppingBag,
  Edit,
  Tags,
} from 'lucide-react';
import type { InventoryItem, InventoryItemVariant } from '@/types';
import { categories as allCategories } from '@/types';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';
import Link from 'next/link';
import { BulkEditVariantsDialog } from './bulk-edit-variants-dialog';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { AppLayout } from '../app-layout';
import Dashboard from './dashboard';

interface InventoryTableProps {
  onUpdateStock: (itemId: string) => void;
  category?: string;
}

function InventoryTableSkeleton() {
    return (
        <div className="border rounded-lg shadow-sm">
             <div className="p-4 border-b"><Skeleton className="h-9 w-full" /></div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40%]"><Skeleton className="h-5 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                        <TableHead className="text-center"><Skeleton className="h-5 w-16" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-sm" />
                                    <div>
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-24 mt-2" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="p-4 border-t"><Skeleton className="h-9 w-1/2" /></div>
        </div>
    )
}

function StockBar({ stock, onUpdateClick }: { stock: number; onUpdateClick: () => void }) {
    const { language } = useLanguage();
    const t = translations[language];

    const getStockColor = (stock: number) => {
        if (stock > 10) return 'bg-green-500';
        if (stock > 0) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="relative w-36 group">
            <Progress value={stock > 100 ? 100 : stock} className="h-6" indicatorClassName={getStockColor(stock)} />
            <div className="absolute inset-0 flex items-center justify-start px-2">
                <div className="flex items-center gap-1">
                    <span className="font-medium text-xs text-foreground">{stock}</span>
                    <Button variant="ghost" size="icon" onClick={onUpdateClick} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t.inventoryTable.updateStock}>
                        <Edit className="h-3 w-3 text-foreground/80" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

const LOW_STOCK_THRESHOLD = 10;

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const PriceWithDetails = ({ item }: { item: InventoryItem | InventoryItemVariant }) => {
    const { language } = useLanguage();
    const t = translations[language];
    const TPrice = t.finance.priceSettingsPage;

    const priceDisplay = item.price != null ? formatCurrency(item.price) : '-';

    const onlinePrice = item.channelPrices?.find(p => ['shopee', 'tiktok', 'lazada'].includes(p.channel) && p.price != null)?.price;
    
    const channelPrices = [
        { channel: 'pos', price: item.channelPrices?.find(p => p.channel === 'pos')?.price },
        { channel: 'reseller', price: item.channelPrices?.find(p => p.channel === 'reseller')?.price },
        { channel: 'online', price: onlinePrice },
    ].filter(p => p.price != null && p.price > 0);

    const getChannelTranslation = (channel: string) => {
        switch(channel) {
            case 'pos': return t.sales.pos;
            case 'reseller': return t.sales.reseller;
            case 'online': return TPrice.onlinePrice;
            default: return channel;
        }
    }

    const triggerText = `${channelPrices.length} ${TPrice.sellingPrices}`;

    return (
        <div className="flex flex-col items-start">
            <span>{priceDisplay}</span>
            {channelPrices.length > 0 && (
                <Popover>
                    <PopoverTrigger asChild>
                         <button className="text-xs text-primary hover:underline mt-1">
                            {triggerText}
                         </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">{TPrice.channelPriceDetails}</h4>
                            <div className="grid gap-2 text-sm">
                                {channelPrices.map(({ channel, price }) => (
                                     <div key={channel} className="grid grid-cols-2 items-center gap-4">
                                        <span className="text-muted-foreground">{getChannelTranslation(channel)}</span>
                                        <span className="font-semibold text-right">{formatCurrency(price!)}</span>
                                     </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
};


export function InventoryTable({ onUpdateStock, category }: InventoryTableProps) {
  const { items, loading } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(category || null);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'empty'>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { language } = useLanguage();
  const t = translations[language];
  const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [selectedBulkEditItem, setSelectedBulkEditItem] = useState<InventoryItem | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCategoryFilter(category || null);
  }, [category]);

  const handleBulkEdit = (item: InventoryItem) => {
    setSelectedBulkEditItem(item);
    setBulkEditDialogOpen(true);
  };

  const filteredItems = useMemo(() => {
    const filtered = items
      .filter((item) =>
        categoryFilter ? item.category === categoryFilter : true
      )
      .filter((item) => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.sku?.toLowerCase().includes(lowerSearchTerm)
        ) return true;

        if (item.variants?.some(v => v.name.toLowerCase().includes(lowerSearchTerm) || v.sku?.toLowerCase().includes(lowerSearchTerm))) {
          return true;
        }

        return false;
      })
      .map(item => {
        if (stockFilter === 'all') return item;

        if (item.variants && item.variants.length > 0) {
            const filteredVariants = item.variants.filter(v => {
                if (stockFilter === 'low') return v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD;
                if (stockFilter === 'empty') return v.stock === 0;
                return true;
            });
            return filteredVariants.length > 0 ? { ...item, variants: filteredVariants } : null;
        } else {
            if (stockFilter === 'low') return (item.stock ?? 0) > 0 && (item.stock ?? 0) <= LOW_STOCK_THRESHOLD ? item : null;
            if (stockFilter === 'empty') return item.stock === 0 ? item : null;
            return item;
        }
      })
      .filter((item): item is InventoryItem => item !== null);
    
      setCurrentPage(1); // Reset to first page on filter change
      return filtered;

  }, [items, categoryFilter, searchTerm, stockFilter]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const stockFilterCounts = useMemo(() => {
    const sourceItems = categoryFilter ? items.filter(i => i.category === categoryFilter) : items;
    const counts = { all: 0, low: 0, empty: 0 };
    sourceItems.forEach(item => {
      counts.all++;
      if (item.variants && item.variants.length > 0) {
        if (item.variants.some(v => v.stock === 0)) counts.empty++;
        if (item.variants.some(v => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD)) counts.low++;
      } else {
        if (item.stock === 0) counts.empty++;
        if ((item.stock ?? 0) > 0 && (item.stock ?? 0) <= LOW_STOCK_THRESHOLD) counts.low++;
      }
    });
    return counts;
  }, [items, categoryFilter]);

  if (loading) {
      return <InventoryTableSkeleton />;
  }

  return (
    <>
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="p-4 flex flex-col gap-4 border-b">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder={t.inventoryTable.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-96"
                    />
                </div>
                {!category && (
                    <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)} defaultValue="all">
                        <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder={t.inventoryTable.selectCategoryPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">{t.inventoryTable.allCategories}</SelectItem>
                        {allCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                            {category}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
        <div className="px-4 py-2 flex items-center gap-2 border-b border-dashed">
            <Button variant={stockFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStockFilter('all')}>
                Semua <Badge variant="secondary" className="ml-2">{stockFilterCounts.all}</Badge>
            </Button>
            <Button variant={stockFilter === 'low' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStockFilter('low')}>
                Stok Menipis <Badge variant="secondary" className="ml-2">{stockFilterCounts.low}</Badge>
            </Button>
            <Button variant={stockFilter === 'empty' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStockFilter('empty')}>
                Stok Kosong <Badge variant="secondary" className="ml-2">{stockFilterCounts.empty}</Badge>
            </Button>
        </div>
      </div>
      <div>
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
            {paginatedItems.length > 0 ? (
              paginatedItems.flatMap((item, itemIndex) => {
                const totalStock = item.variants?.reduce((sum, v) => sum + v.stock, 0) ?? item.stock ?? 0;

                if (item.variants && item.variants.length > 0) {
                    const prices = item.variants.map(v => v.price).filter(p => p != null) as number[];
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    const priceDisplay = prices.length > 0
                        ? minPrice === maxPrice
                            ? formatCurrency(minPrice)
                            : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`
                        : '-';
                    const totalStock = item.variants.reduce((sum, v) => sum + v.stock, 0);

                    return (
                        <React.Fragment key={item.id}>
                            <TableRow className="bg-muted/20 hover:bg-muted/40" noBorder>
                                <TableCell>
                                    <div className="flex items-center gap-4 group">
                                        {category !== 'Accessories' && (
                                            <Image 
                                                src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                                alt={item.name} 
                                                width={40} height={40} 
                                                className="rounded-sm" 
                                                data-ai-hint="product image"
                                            />
                                        )}
                                        {category === 'Accessories' && (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0 bg-muted/50">
                                                 <Tags className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <button onClick={() => handleBulkEdit(item)} className="text-left flex items-center gap-2">
                                                <div className="font-medium text-primary text-sm hover:underline">{item.name}</div>
                                                <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{priceDisplay}</TableCell>
                                <TableCell>
                                    <StockBar stock={totalStock} onUpdateClick={() => handleBulkEdit(item)} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/edit-product/${item.id}`}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    <span>{t.inventoryTable.editProduct}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            {item.variants?.map((variant, variantIndex) => (
                                <TableRow 
                                    key={variant.id}
                                    className={cn(
                                        "hover:bg-muted/50",
                                        (variantIndex === item.variants!.length - 1) && "border-b"
                                    )}
                                    noBorder
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                <Store className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{variant.name}</div>
                                                <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <PriceWithDetails item={variant} />
                                    </TableCell>
                                    <TableCell>
                                        <StockBar stock={variant.stock} onUpdateClick={() => onUpdateStock(variant.id)} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                    </TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    )
                } else {
                    return (
                        <TableRow key={item.id} noBorder className="border-b">
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    {category !== 'Accessories' && (
                                        <Image 
                                            src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                            alt={item.name} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                    )}
                                    {category === 'Accessories' && (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0 bg-muted/50">
                                            <Tags className="h-5 w-5 text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-sm">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                                    </div>
                                </div>
                            </TableCell>
                             <TableCell>
                                <PriceWithDetails item={item} />
                             </TableCell>
                            <TableCell>
                               <StockBar stock={item.stock ?? 0} onUpdateClick={() => onUpdateStock(item.id)} />
                            </TableCell>
                             <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                             <Link href={category === 'Accessories' ? `/inventory/edit-accessory/${item.id}` : `/edit-product/${item.id}`}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>{t.inventoryTable.editProduct}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                }
            })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <ShoppingBag className="h-16 w-16" />
                    <div className="text-center">
                      <p className="font-semibold">{t.inventoryTable.noItems}</p>
                      <p className="text-sm">Coba ubah filter atau tambahkan produk baru.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end p-4 border-t">
            <div className="flex items-center gap-4">
                <Pagination
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
                 <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                    }}
                    >
                    <SelectTrigger className="h-8 w-[200px]">
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
        </div>
      </div>
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

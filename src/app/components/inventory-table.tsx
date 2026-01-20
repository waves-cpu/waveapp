

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Pencil,
  PlusCircle,
  MoreVertical,
  Store,
  ShoppingBag,
  Edit,
  Tags,
  Archive,
  DollarSign,
} from 'lucide-react';
import type { InventoryItem, InventoryItemVariant, Accessory, DiscountGroup } from '@/types';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { UpdateStockDialogAccessories } from './update-stock-dialog-accessories';
import { Checkbox } from '@/components/ui/checkbox';
import { VariantDisplayDialog } from './variant-display-dialog';
import { isWithinInterval, parseISO, endOfDay, format as formatDate, isBefore, isAfter } from 'date-fns';

interface InventoryTableProps {
  onUpdateStock: (itemId: string) => void;
  isAccessoryTable?: boolean;
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

function AccessoryStockDisplay({ item, onUpdateClick }: { item: Accessory; onUpdateClick: () => void }) {
    const totalPcs = (item.quantityPerUnit && item.quantityPerUnit > 0) 
        ? item.stock * item.quantityPerUnit 
        : null;

    return (
        <div className="flex items-center gap-2 group">
            <div>
                <p className="font-medium text-sm">{item.stock.toLocaleString('id-ID')} {item.unit}</p>
                {totalPcs !== null && (
                    <p className="text-xs text-muted-foreground">({totalPcs.toLocaleString('id-ID')} Pcs)</p>
                )}
            </div>
            <Button variant="ghost" size="icon" onClick={onUpdateClick} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Update Stock">
                <Edit className="h-3 w-3 text-foreground/80" />
            </Button>
        </div>
    );
}

function StockBar({ stock, onUpdateClick, item }: { stock: number; onUpdateClick: () => void, item: InventoryItem }) {
    const { language } = useLanguage();
    const t = translations[language];

    const getStockColor = (currentStock: number) => {
        if (currentStock >= 100) return 'bg-green-500';
        if (currentStock >= 50) return 'bg-yellow-500';
        if (currentStock >= 10) return 'bg-orange-500';
        if (currentStock > 0) return 'bg-red-500';
        return 'bg-red-600'; // Empty stock
    };

    const maxProgressValue = 100;
    const progressValue = Math.min(stock, maxProgressValue);

    return (
        <div className="relative w-36 group">
            <Progress value={progressValue} className="h-6" indicatorClassName={getStockColor(stock)} />
            <div className="absolute inset-0 flex items-center justify-start px-2">
                <div className="flex items-center gap-1">
                    <span className="font-medium text-xs text-foreground">{stock.toLocaleString('id-ID')}</span>
                    <Button variant="ghost" size="icon" onClick={onUpdateClick} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t.inventoryTable.updateStock}>
                        <Edit className="h-3 w-3 text-foreground/80" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

const formatCurrency = (amount: number) => `Rp${Math.round(amount).toLocaleString('id-ID')}`;

const PriceDisplay = ({ item, discountGroups }: { item: (InventoryItem | InventoryItemVariant) & {category?: string}; discountGroups: DiscountGroup[] }) => {
    const isParentProduct = 'variants' in item && item.variants && item.variants.length > 0;
    
    type ActiveDiscount = {
      groupName: string;
      channel: string;
      discountedPrice: number;
      originalPrice: number;
      startDate: string;
      endDate: string;
    };

    const activeDiscounts = useMemo((): ActiveDiscount[] => {
        if (isParentProduct) return [];
        const now = new Date();
        const category = item.category;

        if (!category) return [];
        
        const allActiveDiscounts: ActiveDiscount[] = [];

        for (const group of discountGroups) {
            if (!group.products) continue;
            // Category check
            if (group.category !== category) {
                continue;
            }

            const startDate = parseISO(group.startDate);
            const endDate = endOfDay(parseISO(group.endDate));
            
            // Date check
            if (!isWithinInterval(now, { start: startDate, end: endDate })) {
                continue;
            }
            
            const discountedProduct = group.products.find((p: any) => 
                (p.variantId && p.variantId.toString() === item.id) ||
                (!p.variantId && p.productId.toString() === item.id)
            );

            if (discountedProduct && item.price && discountedProduct.discountedPrice < item.price) {
                allActiveDiscounts.push({
                    groupName: group.name,
                    channel: group.channel,
                    discountedPrice: discountedProduct.discountedPrice,
                    originalPrice: item.price,
                    startDate: group.startDate,
                    endDate: group.endDate
                });
            }
        }
        return allActiveDiscounts;
    }, [item, discountGroups, isParentProduct]);

    if (isParentProduct) {
        const prices = item.variants!.map(v => v.price).filter(p => p !== undefined && p !== null);
        if (prices.length === 0) return <span>-</span>;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice === maxPrice) return <span>{formatCurrency(minPrice)}</span>;
        return <span className="text-sm">{formatCurrency(minPrice)} - {formatCurrency(maxPrice)}</span>
    }

    const hasActiveDiscount = activeDiscounts.length > 0;
    
    const getStatus = (startDateStr: string, endDateStr: string): { text: string; variant: 'default' | 'secondary' | 'outline' } => {
        const now = new Date();
        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);

        if (isBefore(now, start)) return { text: 'Dijadwalkan', variant: 'secondary' };
        if (isAfter(now, end)) return { text: 'Berakhir', variant: 'outline' };
        return { text: 'Berjalan', variant: 'default' };
    }

    return (
        <div className="flex items-center gap-1">
             {hasActiveDiscount ? (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <span className="underline decoration-dashed cursor-pointer underline-offset-4">
                                {item.price != null ? formatCurrency(item.price) : '-'}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="p-0 w-80" side="top" align="center">
                            <div className="space-y-2">
                                {activeDiscounts.map((discount, index) => {
                                    const status = getStatus(discount.startDate, discount.endDate);
                                    const title = discount.channel === 'online' ? 'Promo Online' : discount.groupName;
                                    return (
                                        <div key={index} className="p-3 border-b last:border-b-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-sm">{title}</h4>
                                                <Badge variant={status.variant} className="text-xs">{status.text}</Badge>
                                            </div>
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-xs text-muted-foreground">Harga Promo</span>
                                                <div className="text-right">
                                                    <p className="font-bold text-base text-primary">{formatCurrency(discount.discountedPrice)}</p>
                                                    <p className="text-xs text-muted-foreground line-through">{formatCurrency(discount.originalPrice)}</p>
                                                </div>
                                            </div>
                                             <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                 <span>Durasi</span>
                                                 <span>{formatDate(parseISO(discount.startDate), "dd/MM/yy")} - {formatDate(parseISO(discount.endDate), "dd/MM/yy")}</span>
                                             </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <span>{item.price != null ? formatCurrency(item.price) : '-'}</span>
            )}
        </div>
    );
};


export function InventoryTable({ onUpdateStock, isAccessoryTable = false }: InventoryTableProps) {
  const { items, accessories, loading, archiveProduct, discountGroups } = useInventory();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'empty'>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { language } = useLanguage();
  const t = translations[language];
  const TArchived = t.archived;
  const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [selectedBulkEditItem, setSelectedBulkEditItem] = useState<InventoryItem | null>(null);
  const router = useRouter();

  const inventorySource = isAccessoryTable ? accessories : items;

  const handleArchive = async (itemId: string) => {
    try {
        await archiveProduct(itemId, true);
        toast({
            title: TArchived.archiveSuccessTitle,
            description: TArchived.archiveSuccessDesc,
        });
    } catch(error) {
         toast({
            variant: 'destructive',
            title: TArchived.archiveErrorTitle,
            description: TArchived.archiveErrorDesc,
        });
    }
  }

  const filteredItems = useMemo(() => {
    const activeItems = (inventorySource as InventoryItem[]).filter(item => !item.isArchived);
    const filtered = activeItems
      .filter((item) =>
        isAccessoryTable ? true : (categoryFilter ? item.category === categoryFilter : true)
      )
      .filter((item) => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          (item.sku && item.sku.toLowerCase().includes(lowerSearchTerm))
        ) return true;

        if (item.variants?.some(v => v.name.toLowerCase().includes(lowerSearchTerm) || (v.sku && v.sku.toLowerCase().includes(lowerSearchTerm)))) {
          return true;
        }

        return false;
      })
      .map(item => {
        if (stockFilter === 'all') return item;
        const totalStock = item.variants ? item.variants.reduce((sum, v) => sum + v.stock, 0) : (item.stock || 0);
        
        if (stockFilter === 'low') {
            return totalStock > 0 && totalStock < 50 ? item : null;
        }
        if (stockFilter === 'empty') {
            return totalStock === 0 ? item : null;
        }
        return item;
      })
      .filter((item): item is InventoryItem => item !== null);
    
      setCurrentPage(1); // Reset to first page on filter change
      return filtered;

  }, [inventorySource, categoryFilter, searchTerm, stockFilter, isAccessoryTable]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const stockFilterCounts = useMemo(() => {
    const source = isAccessoryTable ? accessories : (categoryFilter ? items.filter(i => i.category === categoryFilter && !i.isArchived) : items.filter(i => !i.isArchived));
    const counts = { all: 0, low: 0, empty: 0 };
    (source as InventoryItem[]).forEach(item => {
      counts.all++;
      const totalStock = item.variants ? item.variants.reduce((sum, v) => sum + v.stock, 0) : (item.stock || 0);

      if (totalStock === 0) {
        counts.empty++;
      } else if (totalStock > 0 && totalStock < 50) {
        counts.low++;
      }
    });
    return counts;
  }, [items, accessories, categoryFilter, isAccessoryTable]);

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
                {!isAccessoryTable && (
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
                {t.inventoryTable.allStock} <Badge variant="secondary" className="ml-2">{stockFilterCounts.all}</Badge>
            </Button>
            <Button variant={stockFilter === 'low' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStockFilter('low')}>
                {t.inventoryTable.lowStock} <Badge variant="secondary" className="ml-2">{stockFilterCounts.low}</Badge>
            </Button>
            <Button variant={stockFilter === 'empty' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStockFilter('empty')}>
                {t.inventoryTable.emptyStock} <Badge variant="secondary" className="ml-2">{stockFilterCounts.empty}</Badge>
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
              paginatedItems.flatMap((item) => {
                if (item.variants && item.variants.length > 0) {
                    const totalStock = item.variants.reduce((sum, v) => sum + v.stock, 0);

                    return (
                        <React.Fragment key={item.id}>
                            <TableRow className="bg-muted/20 hover:bg-muted/40" noBorder>
                                <TableCell>
                                    <div className="flex items-center gap-4 group">
                                        <Image 
                                            src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                            alt={item.name} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                        <div>
                                            <Link href={`/products/${item.id}/analytics`}>
                                                <div className="font-medium text-primary text-sm hover:underline truncate max-w-xs">{item.name}</div>
                                            </Link>
                                            <div className="text-xs text-muted-foreground truncate">SKU: {item.sku}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <PriceDisplay item={item} discountGroups={discountGroups} />
                                </TableCell>
                                <TableCell>
                                    <StockBar stock={totalStock} onUpdateClick={() => {setSelectedBulkEditItem(item); setBulkEditDialogOpen(true);}} item={item} />
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
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        <span>{TArchived.archiveButton}</span>
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{TArchived.archiveDialogTitle}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {TArchived.archiveDialogDesc}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleArchive(item.id)}>{TArchived.archiveDialogConfirm}</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            {item.variants?.map((variant, variantIndex) => (
                                <TableRow 
                                    key={variant.id}
                                    className="hover:bg-muted/50"
                                    noBorder={variantIndex !== item.variants!.length - 1}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                                <Store className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm truncate max-w-xs">{variant.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">SKU: {variant.sku}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <PriceDisplay item={{...variant, category: item.category}} discountGroups={discountGroups} />
                                    </TableCell>
                                    <TableCell>
                                        <StockBar stock={variant.stock} onUpdateClick={() => onUpdateStock(variant.id)} item={item} />
                                    </TableCell>
                                    <TableCell className="text-center">
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
                                    {isAccessoryTable ? (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0 bg-muted/50">
                                             <Tags className="h-5 w-5 text-gray-400" />
                                        </div>
                                    ) : (
                                        <Image 
                                            src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                            alt={item.name} 
                                            width={40} height={40} 
                                            className="rounded-sm" 
                                            data-ai-hint="product image"
                                        />
                                    )}
                                    <div>
                                         <Link href={`/products/${item.id}/analytics`}>
                                            <div className="font-medium text-primary text-sm hover:underline truncate max-w-xs">{item.name}</div>
                                        </Link>
                                        <div className="text-xs text-muted-foreground truncate">SKU: {item.sku}</div>
                                    </div>
                                </div>
                            </TableCell>
                             <TableCell>
                                <PriceDisplay item={item} discountGroups={discountGroups} />
                             </TableCell>
                            <TableCell>
                                {isAccessoryTable ? (
                                    <AccessoryStockDisplay item={item as Accessory} onUpdateClick={() => onUpdateStock(item.id)} />
                                ) : (
                                    <StockBar stock={item.stock ?? 0} onUpdateClick={() => onUpdateStock(item.id)} item={item} />
                                )}
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
                                             <Link href={isAccessoryTable ? `/inventory/edit-accessory/${item.id}` : `/edit-product/${item.id}`}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>{t.inventoryTable.editProduct}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    <span>{TArchived.archiveButton}</span>
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{TArchived.archiveDialogTitle}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {TArchived.archiveDialogDesc}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleArchive(item.id)}>{TArchived.archiveDialogConfirm}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                }
            })
            ) : (
              <TableRow>
                <TableCell colSpan={isAccessoryTable ? 4 : 5} className="h-48 text-center">
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
        <div className="flex items-center justify-end p-4 border-t gap-4">
             <div className="text-xs text-muted-foreground">
                Menampilkan {paginatedItems.length} dari {filteredItems.length} produk.
             </div>
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
                <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                    {[10, 20, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                        {`${pageSize} / halaman`}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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

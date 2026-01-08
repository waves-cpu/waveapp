
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScanLine, ShoppingCart, Search, Eye, ArrowLeft, MoreVertical, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatToWIB } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/app/components/app-layout';
import { Pagination } from '@/components/ui/pagination';
import { DailySalesDetailDialog } from '@/app/components/daily-sales-detail-dialog';
import { Badge } from '@/components/ui/badge';
import { RecordSaleForReceiptDialog } from '@/app/components/record-sale-for-receipt-dialog';
import { useReceiptPageLogic } from '@/hooks/use-receipt-page-logic';


function DatePickerClient({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date | undefined,
  onDateChange: (date: Date | undefined) => void,
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={'outline'}
          className={cn(
            'w-full sm:w-[240px] justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isClient && selectedDate ? format(selectedDate, 'PPP') : <span>Pilih tanggal</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const TableSkeleton = () => (
    <>
        {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
            </TableRow>
        ))}
    </>
);

const EmptyState = ({ searchTerm }: { searchTerm: string }) => (
     <TableRow>
        <TableCell colSpan={4} className="h-48 text-center">
            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <ShoppingCart className="h-16 w-16" />
                <div className="text-center">
                    <p className="font-semibold">Tidak Ada Resi</p>
                    <p className="text-sm">
                         {searchTerm ? `Tidak ada resi yang cocok dengan pencarian "${searchTerm}".` : "Belum ada resi yang tercatat untuk hari ini."}
                    </p>
                </div>
            </div>
        </TableCell>
    </TableRow>
);

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" | "orange" | "purple" => {
    switch (status.toLowerCase()) {
        case 'selesai': return 'success';
        case 'return selesai': return 'purple';
        case 'siap kirim': return 'info';
        case 'terproses': return 'warning';
        case 'perlu diproses': return 'warning';
        case 'diantar': return 'info';
        case 'return': return 'orange';
        case 'dibatalkan':
        case 'tidak sampai': return 'destructive';
        default: return 'outline';
    }
};

export default function ShopeeChannelPage() {
  const {
      t, router, receipts, totalReceipts, loading, awb, setAwb, isSubmitting, awbInputRef,
      currentPage, setCurrentPage, itemsPerPage, searchTerm, setSearchTerm, selectedDate,
      setSelectedDate, detailItems, isDetailOpen, setIsDetailOpen, receiptForSale, setReceiptForSale,
      isSaleDialogOpen, setIsSaleDialogOpen, salesChannel, shippingChannel,
      handleAwbSubmit, handleViewDetails, handleSaleComplete, totalPages
  } = useReceiptPageLogic('Shopee');

  return (
    <AppLayout>
      <main className="flex min-h-svh flex-1 flex-col gap-4 bg-muted/40 p-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <SidebarTrigger className="hidden md:flex" />
            <h1 className="text-lg md:text-xl font-bold font-headline text-foreground">
                {salesChannel} - {shippingChannel}
            </h1>
        </div>

        <div className="bg-card rounded-lg border shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center border-b">
              <form onSubmit={handleAwbSubmit} className="flex-grow md:max-w-sm">
                  <div className="relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          ref={awbInputRef}
                          placeholder="Scan atau masukkan No. Resi (AWB), lalu Enter"
                          value={awb}
                          onChange={(e) => setAwb(e.target.value)}
                          className="pl-10 w-full"
                          disabled={isSubmitting || isSaleDialogOpen}
                          autoFocus
                      />
                  </div>
              </form>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Resi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                    />
                </div>
                <DatePickerClient selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </div>
          </div>
          <div className="flex-grow overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[200px]">Tanggal</TableHead>
                  <TableHead>No. Resi (AWB)</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableSkeleton /> : receipts.length > 0 ? (
                  receipts.map((receipt) => {
                    const isUnprocessed = receipt.status === 'Perlu Diproses';
                    
                    return (
                        <TableRow key={receipt.id} className={cn(isUnprocessed && 'bg-yellow-50/50 hover:bg-yellow-50')}>
                          <TableCell>{format(new Date(receipt.date), 'dd MMM yyyy, HH:mm')}</TableCell>
                          <TableCell className="font-medium">{receipt.awb}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleViewDetails(receipt)}>
                               {!isUnprocessed ? "Lihat Produk" : "Catat Produk"}
                                <Eye className="ml-2 h-3 w-3" />
                            </Button>
                          </TableCell>
                           <TableCell>
                                <Badge variant={getStatusVariant(receipt.status)}>
                                    {receipt.status}
                                </Badge>
                           </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                    <EmptyState searchTerm={searchTerm} />
                )}
              </TableBody>
            </Table>
          </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-end p-4 border-t">
                    <div className="flex items-center gap-4">
                        <Pagination
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            )}
        </div>
      </main>
      <DailySalesDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          sales={detailItems}
      />
       <RecordSaleForReceiptDialog
        open={isSaleDialogOpen}
        onOpenChange={(isOpen) => {
          setIsSaleDialogOpen(isOpen);
          if (!isOpen) {
            setReceiptForSale(null);
          }
        }}
        onSaleComplete={handleSaleComplete}
        receipt={receiptForSale}
      />
    </AppLayout>
  );
}

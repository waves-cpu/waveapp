

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UploadCloud, Download, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { categories as allCategories } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type ProductRow = {
  parent_sku: string;
  product_name: string;
  category: string;
  image_url: string;
  variant_sku: string;
  variant_name: string;
  price: number;
  stock: number;
  cost_price: number;
};

interface BulkEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface DetailDialogData {
    title: string;
    items: string[];
}

export function BulkEditSheet({ open, onOpenChange }: BulkEditSheetProps) {
  const { items, bulkUpdateProducts, fetchItems } = useInventory();
  const { toast } = useToast();
  const [data, setData] = useState<Partial<ProductRow>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = translations[language];
  const [detailDialogData, setDetailDialogData] = useState<DetailDialogData | null>(null);

  useEffect(() => {
    if (!open) {
      setData([]);
      setFileName('');
      setCategoryFilter(null);
    }
  }, [open]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, defval: null });
        
        const cleanedData = jsonData.map(row => ({
            parent_sku: row.parent_sku ? String(row.parent_sku).trim() : '',
            product_name: row.product_name ? String(row.product_name).trim() : '',
            category: row.category ? String(row.category).trim() : '',
            image_url: row.image_url ? String(row.image_url).trim() : '',
            variant_sku: row.variant_sku ? String(row.variant_sku).trim() : '',
            variant_name: row.variant_name ? String(row.variant_name).trim() : '',
            price: row.price != null ? Number(row.price) : undefined,
            stock: row.stock != null ? Number(row.stock) : undefined,
            cost_price: row.cost_price != null ? Number(row.cost_price) : undefined,
        }));

        setData(cleanedData);
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const handleDownloadTemplate = () => {
    const { toast: toastRef } = toast({ title: 'Memulai unduhan', description: 'Template produk sedang disiapkan...' });
    const filteredItems = categoryFilter ? items.filter(item => item.category === categoryFilter) : items;

    const exportData: ProductRow[] = [];
    filteredItems.forEach(item => {
        if (item.variants && item.variants.length > 0) {
            item.variants.forEach((variant, index) => {
                exportData.push({
                    parent_sku: item.sku || '',
                    product_name: index === 0 ? item.name : '',
                    category: index === 0 ? item.category : '',
                    image_url: index === 0 ? item.imageUrl || '' : '',
                    variant_sku: variant.sku || '',
                    variant_name: variant.name,
                    price: variant.price,
                    stock: variant.stock,
                    cost_price: variant.costPrice || 0
                });
            });
        } else {
             exportData.push({
                parent_sku: item.sku || '',
                product_name: item.name,
                category: item.category,
                image_url: item.imageUrl || '',
                variant_sku: '',
                variant_name: '',
                price: item.price || 0,
                stock: item.stock || 0,
                cost_price: item.costPrice || 0
            });
        }
    });

    if (exportData.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Tidak ada produk untuk diekspor pada kategori ini.' });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const fileName = `edit_produk_${categoryFilter || 'semua'}.xlsx`;
    saveAs(blob, fileName);
    toastRef.update({
        id: toastRef.id,
        title: "Unduhan Siap",
        description: `File '${fileName}' telah diunduh. Periksa folder unduhan browser Anda.`
    });
  };

  const handleImport = async () => {
    if (data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak ada data',
        description: 'Silakan unggah file yang berisi data produk.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { updatedCount, notFoundSkus } = await bulkUpdateProducts(data);
      
      toast({
        title: 'Update Selesai',
        description: `${updatedCount} baris produk/varian berhasil diperbarui.`,
      });
      if (notFoundSkus.length > 0) {
          setDetailDialogData({title: `SKU Tidak Ditemukan (${notFoundSkus.length})`, items: notFoundSkus});
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Update Gagal',
        description: `Terjadi kesalahan: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
      await fetchItems();
    }
  };

  return (
    <>
        <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl w-full flex flex-col">
            <SheetHeader>
            <SheetTitle>Edit Produk Massal</SheetTitle>
            <SheetDescription>
                Unduh template berdasarkan kategori, ubah data di Excel, lalu unggah kembali untuk memperbarui beberapa produk sekaligus.
            </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 pt-6 flex-1 flex flex-col">
                <div className="grid md:grid-cols-1 gap-6">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                    <Download className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="font-semibold">Langkah 1: Unduh Template</h3>
                    <div className="flex items-center gap-2 mt-4">
                        <Select onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Pilih Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                {allCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                    {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleDownloadTemplate} variant="outline">
                            Unduh
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="font-semibold">Langkah 2: Unggah File Excel</h3>
                    <Button asChild variant="outline" className="mt-4">
                        <label htmlFor="edit-file-upload">
                            Pilih File
                            <input id="edit-file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
                        </label>
                    </Button>
                    {fileName && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</p>}
                </div>
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center bg-primary/5">
                    <h3 className="font-semibold">Langkah 3: Terapkan Perubahan</h3>
                    <Button onClick={handleImport} disabled={data.length === 0 || isSubmitting} className="mt-4">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Impor & Perbarui'}
                    </Button>
                    {isSubmitting && <p className="text-xs text-muted-foreground mt-2">Memperbarui {data.length} baris...</p>}
                    {data.length > 0 && !isSubmitting &&(
                        <p className="text-xs text-muted-foreground mt-2">
                            Pastikan SKU induk dan SKU varian tidak diubah dari template.
                        </p>
                    )}
                </div>
                </div>
            </div>
        </SheetContent>
        </Sheet>
        <Dialog open={!!detailDialogData} onOpenChange={() => setDetailDialogData(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{detailDialogData?.title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-80 border rounded-md p-4">
                    <ul className="list-disc list-inside">
                        {detailDialogData?.items.map((item, index) => (
                            <li key={index} className="text-sm">
                                {item}
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </>
  );
}

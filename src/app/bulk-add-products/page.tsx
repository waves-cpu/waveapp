
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, Download, PackageCheck, AlertTriangle, FileText, Trash2, History, Eye, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { format } from 'date-fns';
import type { BulkImportHistory } from '@/types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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

interface DetailDialogData {
    title: string;
    items: string[];
}

export default function BulkAddProductsPage() {
  const { bulkAddProducts, fetchImportHistory, deleteImportHistory } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<ProductRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importHistory, setImportHistory] = useState<BulkImportHistory[]>([]);
  const [detailDialogData, setDetailDialogData] = useState<DetailDialogData | null>(null);
  const { language } = useLanguage();
  const t = translations[language];
  const TBulk = t.bulkStockInDialog;

  const loadHistory = useCallback(async () => {
    try {
      const history = await fetchImportHistory();
      setImportHistory(history);
    } catch(error) {
       toast({
        variant: 'destructive',
        title: 'Gagal memuat riwayat',
        description: `Terjadi kesalahan saat memuat riwayat impor.`,
      });
    }
  }, [fetchImportHistory, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
        const jsonData = XLSX.utils.sheet_to_json<ProductRow>(worksheet);
        setData(jsonData);
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const handleDownloadTemplate = () => {
    const templateData: Partial<ProductRow>[] = [
      {
        parent_sku: 'TSHIRT-COOL-PARENT',
        product_name: 'Cool T-Shirt',
        category: 'T-Shirt Oversize',
        image_url: 'https://example.com/image.png',
        variant_sku: 'TSHIRT-COOL-L',
        variant_name: 'Large',
        price: 150000,
        stock: 50,
        cost_price: 75000,
      },
      {
        parent_sku: 'TSHIRT-COOL-PARENT',
        product_name: '',
        category: '',
        image_url: '',
        variant_sku: 'TSHIRT-COOL-M',
        variant_name: 'Medium',
        price: 150000,
        stock: 100,
        cost_price: 75000,
      },
       {
        parent_sku: 'HAT-SIMPLE',
        product_name: 'Simple Hat',
        category: 'Caps',
        image_url: 'https://example.com/hat.png',
        variant_sku: '',
        variant_name: '',
        price: 80000,
        stock: 200,
        cost_price: 40000,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'template_produk_massal.xlsx');
  };

  const handleImport = async () => {
    if (data.length === 0) {
      toast({
        variant: 'destructive',
        title: TBulk.noData,
        description: TBulk.noDataDesc,
      });
      return;
    }

    setIsSubmitting(true);
    let historyId: number | undefined;

    try {
      const plainData = JSON.parse(JSON.stringify(data));
      // First, create a "processing" entry and add it to the UI immediately
      const tempEntry = {
        id: Date.now(), // temporary key
        fileName,
        date: new Date().toISOString(),
        status: 'Memproses...' as const,
        progress: 0,
        addedCount: 0,
        skippedCount: 0
      }
      setImportHistory(prev => [tempEntry, ...prev]);
      
      setData([]);
      setFileName('');

      // Now call the server function
      const finalResult = await bulkAddProducts(plainData, fileName);
      historyId = finalResult.id;
      
      // Replace the temporary entry with the final result from the database
      setImportHistory(prev => prev.map(item => item.id === tempEntry.id ? finalResult : item));
      
      // Optionally, show a toast for skipped items if any
      if (finalResult.skippedCount && finalResult.skippedCount > 0) {
          toast({
              title: TBulk.skippedTitle,
              description: TBulk.skippedDesc.replace('{count}', finalResult.skippedCount.toString())
          });
      }


    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: TBulk.importFailed,
        description: `${TBulk.importFailedDesc}: ${errorMessage}`,
      });
       // If there was an error, we should get the latest state which might include a failed entry.
       await loadHistory();
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeResult = async (id: number) => {
    await deleteImportHistory(id);
    setImportHistory(results => results.filter(r => r.id !== id));
  }
  
  const openDetailDialog = (title: string, items: string[] | undefined) => {
    if (items && items.length > 0) {
        setDetailDialogData({ title, items });
    }
  }
  
  const getStatusComponent = (status: string) => {
    switch (status) {
        case 'Berhasil':
            return <Badge className="bg-green-600 hover:bg-green-700">{status}</Badge>;
        case 'Gagal':
            return <Badge variant="destructive">{status}</Badge>;
        case 'Memproses...':
            return <div className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>{status}</span></div>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
  }


  return (
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{t.dashboard.bulk}</h1>
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                <Download className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">{TBulk.step1}</h3>
                <Button onClick={handleDownloadTemplate} variant="outline" className="mt-4">
                  {TBulk.downloadTemplate}
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                 <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">{TBulk.step2}</h3>
                <Button asChild variant="outline" className="mt-4">
                    <label htmlFor="file-upload">
                        {TBulk.chooseFile}
                        <input id="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
                    </label>
                </Button>
                 {fileName && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</p>}
              </div>
              
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                 <PackageCheck className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">{TBulk.step3}</h3>
                 <Button onClick={handleImport} disabled={data.length === 0 || isSubmitting} className="mt-4">
                    {isSubmitting ? TBulk.importing : `${TBulk.import} ${data.length} ${TBulk.rows}`}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
                <Card>
                <ScrollArea className="h-96">
                    <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                        <TableHead className="text-xs w-[40%]">{TBulk.historyTable.file}</TableHead>
                        <TableHead className="text-center text-xs">{TBulk.historyTable.status}</TableHead>
                        <TableHead className="text-center text-xs">{TBulk.historyTable.added}</TableHead>
                        <TableHead className="text-center text-xs">{TBulk.historyTable.skipped}</TableHead>
                        <TableHead className="text-center text-xs">{TBulk.historyTable.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {importHistory.length > 0 ? (
                        importHistory.map((result) => (
                            <TableRow key={result.id}>
                            <TableCell className="text-xs font-medium">
                                <div>{result.fileName}</div>
                                <div className="text-muted-foreground">{format(new Date(result.date), 'dd MMM yyyy, HH:mm')}</div>
                            </TableCell>
                            <TableCell className="text-center text-xs">
                                {getStatusComponent(result.status)}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => openDetailDialog('SKU yang Berhasil Ditambahkan', result.addedSkus)} disabled={!result.addedSkus || result.addedSkus.length === 0}>
                                    {result.addedCount ?? '-'}
                                </Button>
                            </TableCell>
                            <TableCell className="text-center text-xs">
                                 <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => openDetailDialog('SKU yang Dilewati (Duplikat)', result.skippedSkus)} disabled={!result.skippedSkus || result.skippedSkus.length === 0}>
                                    {result.skippedCount ?? '-'}
                                </Button>
                            </TableCell>
                            <TableCell className="text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeResult(result.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <History className="h-8 w-8" />
                                <p className="font-semibold">{TBulk.noHistory}</p>
                                <p className="text-sm">{TBulk.noHistoryDesc}</p>
                            </div>
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </ScrollArea>
                </Card>
            </div>
            </CardContent>
        </Card>
        
        <Dialog open={!!detailDialogData} onOpenChange={() => setDetailDialogData(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{detailDialogData?.title}</DialogTitle>
                </DialogHeader>
                 <ScrollArea className="max-h-80 border rounded-md p-4">
                    <ul className="list-disc list-inside">
                        {detailDialogData?.items.map((item, index) => (
                            <li key={index} className="text-sm">{item}</li>
                        ))}
                    </ul>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        </main>
    </AppLayout>
    );
}

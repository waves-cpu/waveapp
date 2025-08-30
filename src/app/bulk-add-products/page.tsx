
'use client';

import React, { useState, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, Download, PackageCheck, AlertTriangle, FileText, Trash2, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { format } from 'date-fns';

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

interface ImportResult {
    id: string;
    fileName: string;
    date: string;
    status: 'Berhasil' | 'Gagal';
    count: number;
    skippedCount: number;
    error?: string;
}

export default function BulkAddProductsPage() {
  const { bulkAddProducts } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<ProductRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const { language } = useLanguage();
  const t = translations[language];
  const TBulk = t.bulkStockInDialog;

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
        toast({
          title: TBulk.fileLoaded,
          description: `${jsonData.length} ${TBulk.rowsLoaded.replace('{file}', file.name)}`,
        });
      };
      reader.readAsBinaryString(file);
    }
  }, [toast, TBulk]);

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
    const newResult: Omit<ImportResult, 'id'> = {
        fileName: fileName,
        date: new Date().toISOString(),
        status: 'Gagal',
        count: 0,
        skippedCount: 0,
    };

    try {
      const plainData = JSON.parse(JSON.stringify(data));
      const result = await bulkAddProducts(plainData);
      
      newResult.status = 'Berhasil';
      newResult.count = result.addedCount;
      newResult.skippedCount = result.skippedSkus.length;
      
      toast({
        title: TBulk.importSuccess,
        description: `${result.addedCount} ${TBulk.importSuccessDesc}`,
      });

      if (result.skippedSkus.length > 0) {
        toast({
            variant: "default",
            title: TBulk.skippedTitle,
            description: `${TBulk.skippedDesc.replace('{count}', result.skippedSkus.length.toString())}: ${result.skippedSkus.join(', ')}`,
        })
      }
      
      // Clear data after successful import
      setData([]);
      setFileName('');

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      newResult.error = errorMessage;
      toast({
        variant: 'destructive',
        title: TBulk.importFailed,
        description: `${TBulk.importFailedDesc}: ${errorMessage}`,
      });
    } finally {
      setImportResults(prev => [{ ...newResult, id: Date.now().toString() }, ...prev]);
      setIsSubmitting(false);
    }
  };

  const removeResult = (id: string) => {
    setImportResults(results => results.filter(r => r.id !== id));
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

            <div className="space-y-2">
              <h3 className="font-semibold">Riwayat Impor</h3>
              <Card>
                <ScrollArea className="h-72">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="text-xs w-[40%]">Nama</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-right text-xs">Jumlah</TableHead>
                        <TableHead className="text-right text-xs">Dilewati</TableHead>
                        <TableHead className="text-center text-xs">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.length > 0 ? (
                        importResults.map((result) => (
                          <TableRow key={result.id}>
                            <TableCell className="text-xs font-medium">
                              <div>{result.fileName}</div>
                              <div className="text-muted-foreground">{format(new Date(result.date), 'dd MMM yyyy, HH:mm')}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className={`px-2 py-1 rounded-full text-white text-xs ${result.status === 'Berhasil' ? 'bg-green-600' : 'bg-red-600'}`}>
                                {result.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs">{result.count}</TableCell>
                            <TableCell className="text-right text-xs">{result.skippedCount}</TableCell>
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
                                <p className="font-semibold">Belum Ada Riwayat</p>
                                <p className="text-sm">Riwayat impor massal Anda akan muncul di sini.</p>
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
      </main>
    </AppLayout>
  );
}

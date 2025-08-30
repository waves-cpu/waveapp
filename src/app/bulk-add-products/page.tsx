
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
import { UploadCloud, Download, PackageCheck, AlertTriangle, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function BulkAddProductsPage() {
  const { bulkAddProducts } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<ProductRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');

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
          title: 'File Loaded',
          description: `${jsonData.length} rows loaded from ${file.name}. Please review before importing.`,
        });
      };
      reader.readAsBinaryString(file);
    }
  }, [toast]);

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
        title: 'No Data',
        description: 'Please upload a file with product data first.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bulkAddProducts(data);
      toast({
        title: 'Import Successful',
        description: `${result.addedCount} product groups have been added.`,
      });

      if (result.skippedSkus.length > 0) {
        toast({
            variant: "default",
            title: "Some Products Skipped",
            description: `Skipped ${result.skippedSkus.length} product groups because their parent SKUs already exist: ${result.skippedSkus.join(', ')}`,
        })
      }

      router.push('/');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: `An error occurred during import: ${errorMessage}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">Tambah Produk Massal</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Impor Produk dari Excel</CardTitle>
            <CardDescription>
              Ikuti langkah-langkah ini untuk menambahkan beberapa produk sekaligus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                <Download className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">Langkah 1: Unduh Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Gunakan template kami untuk memastikan format data Anda benar.
                </p>
                <Button onClick={handleDownloadTemplate} variant="outline">
                  Unduh Template
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                 <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">Langkah 2: Isi & Unggah File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Isi data produk Anda di file Excel dan unggah di sini.
                </p>
                <Button asChild variant="outline">
                    <label htmlFor="file-upload">
                        Pilih File
                        <input id="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" />
                    </label>
                </Button>
                 {fileName && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</p>}
              </div>
              
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center">
                 <PackageCheck className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="font-semibold">Langkah 3: Tinjau & Impor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tinjau data di bawah. Jika sudah benar, klik tombol impor.
                </p>
                 <Button onClick={handleImport} disabled={data.length === 0 || isSubmitting}>
                    {isSubmitting ? 'Mengimpor...' : `Impor ${data.length} Baris`}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Pratinjau Data</h3>
              <Card>
                <ScrollArea className="h-72">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead>SKU Induk</TableHead>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>SKU Varian</TableHead>
                        <TableHead>Nama Varian</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.length > 0 ? (
                        data.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.parent_sku}</TableCell>
                            <TableCell>{row.product_name || '"'}</TableCell>
                            <TableCell>{row.category || '"'}</TableCell>
                            <TableCell>{row.variant_sku}</TableCell>
                            <TableCell>{row.variant_name}</TableCell>
                            <TableCell className="text-right">{row.price}</TableCell>
                            <TableCell className="text-right">{row.stock}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <AlertTriangle className="h-8 w-8" />
                                <p className="font-semibold">Tidak ada data untuk ditampilkan</p>
                                <p className="text-sm">Unggah file untuk melihat pratinjau di sini.</p>
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

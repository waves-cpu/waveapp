
'use client';

import React, { useState, useCallback } from 'react';
import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileDown, AlertCircle, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ProductData = {
  'Nama Produk': string;
  'Kategori': string;
  'SKU Induk'?: string;
  'Nama Varian'?: string;
  'SKU Varian'?: string;
  'Harga Modal'?: number;
  'Harga Jual'?: number;
  'Stok Awal'?: number;
  'Image URL'?: string;
};

const REQUIRED_COLUMNS = ['Nama Produk', 'Kategori'];

export default function BulkAddProductPage() {
    const [data, setData] = useState<ProductData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { bulkAddItems } = useInventory();
    const { toast } = useToast();
    const router = useRouter();


    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            processFile(event.dataTransfer.files[0]);
        }
    };

    const processFile = (file: File) => {
        setError(null);
        setData([]);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<ProductData>(worksheet);

                // Validate headers
                const headers = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })[0];
                const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

                if (missingHeaders.length > 0) {
                    setError(`Kolom yang wajib diisi hilang dari file: ${missingHeaders.join(', ')}. Silakan unduh dan gunakan template yang disediakan.`);
                    return;
                }
                
                setData(jsonData);
            } catch (err) {
                console.error("Error processing file:", err);
                setError("Gagal memproses file. Pastikan format file benar.");
            }
        };
        reader.readAsBinaryString(file);
    }

    const downloadTemplate = (type: 'basic' | 'media') => {
        let sampleData: any[];
        let fileName: string;

        const baseSample = [
            {
                'Nama Produk': 'T-Shirt Keren', 'Kategori': 'Pakaian', 'SKU Induk': 'TS001', 'Nama Varian': 'Merah - L', 'SKU Varian': 'TS001-M-L', 'Harga Modal': 50000, 'Harga Jual': 100000, 'Stok Awal': 50
            },
             {
                'Nama Produk': 'T-Shirt Keren', 'Kategori': 'Pakaian', 'SKU Induk': 'TS001', 'Nama Varian': 'Merah - XL', 'SKU Varian': 'TS001-M-XL', 'Harga Modal': 50000, 'Harga Jual': 100000, 'Stok Awal': 30
            },
            {
                'Nama Produk': 'Topi Polos', 'Kategori': 'Aksesoris', 'SKU Induk': 'TP001', 'Nama Varian': '', 'SKU Varian': '', 'Harga Modal': 25000, 'Harga Jual': 50000, 'Stok Awal': 100
            }
        ];

        if (type === 'media') {
            sampleData = baseSample.map(item => ({ ...item, 'Image URL': 'https://placehold.co/100x100.png' }));
            fileName = 'Template_Informasi_Media.xlsx';
        } else {
            sampleData = baseSample;
            fileName = 'Template_Informasi_Dasar.xlsx';
        }

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Produk');
        XLSX.writeFile(workbook, fileName);
    };
    
    const handleSubmit = async () => {
        if(data.length === 0) return;
        setIsSubmitting(true);
        try {
            await bulkAddItems(data);
            toast({
                title: 'Impor Berhasil',
                description: `${data.length} baris data produk telah berhasil diproses.`
            });
            router.push('/');
        } catch (error) {
            console.error("Error submitting bulk products:", error);
            toast({
                variant: 'destructive',
                title: 'Impor Gagal',
                description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan produk.'
            })
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <AppLayout>
            <main className="flex min-h-screen flex-col items-center p-4 md:p-10 pb-8">
                <div className="w-full max-w-7xl">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">Tambah Produk Secara Masal</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Impor dari Excel</CardTitle>
                            <CardDescription>
                                Unduh salah satu template, isi dengan data produk Anda, lalu unggah file di sini untuk menambah banyak produk sekaligus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <FileDown className="mr-2 h-4 w-4"/>
                                            Unduh Template
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => downloadTemplate('basic')}>
                                            <Info className="mr-2 h-4 w-4" />
                                            <span>Informasi Dasar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadTemplate('media')}>
                                            <Info className="mr-2 h-4 w-4" />
                                            <span>Informasi Media</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="relative">
                                    <Button asChild>
                                        <label htmlFor="file-upload">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Pilih File Excel
                                        </label>
                                    </Button>
                                    <input id="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".xlsx, .xls, .csv"/>
                                </div>
                            </div>

                             <div 
                                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center bg-muted/20"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <p className="text-muted-foreground">Atau seret dan lepas file di sini</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-start gap-4">
                                    <AlertCircle className="h-5 w-5 mt-0.5"/>
                                    <p className="flex-1 text-sm">{error}</p>
                                </div>
                            )}

                             {data.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-medium">Pratinjau Data ({data.length} baris)</h3>
                                    <ScrollArea className="h-72 w-full border rounded-md">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-card">
                                                <TableRow>
                                                    <TableHead>Nama Produk</TableHead>
                                                    <TableHead>Kategori</TableHead>
                                                    <TableHead>SKU Induk</TableHead>
                                                    <TableHead>Nama Varian</TableHead>
                                                    <TableHead>SKU Varian</TableHead>
                                                    <TableHead>Harga Modal</TableHead>
                                                    <TableHead>Harga Jual</TableHead>
                                                    <TableHead>Stok Awal</TableHead>
                                                    <TableHead>Image URL</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{row['Nama Produk']}</TableCell>
                                                        <TableCell>{row['Kategori']}</TableCell>
                                                        <TableCell>{row['SKU Induk']}</TableCell>
                                                        <TableCell>{row['Nama Varian']}</TableCell>
                                                        <TableCell>{row['SKU Varian']}</TableCell>
                                                        <TableCell>{row['Harga Modal']}</TableCell>
                                                        <TableCell>{row['Harga Jual']}</TableCell>
                                                        <TableCell>{row['Stok Awal']}</TableCell>
                                                        <TableCell>{row['Image URL']}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            )}

                        </CardContent>
                        {data.length > 0 && (
                            <CardFooter className="justify-end">
                                <Button onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Semua Produk'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}

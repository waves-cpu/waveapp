'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, FileDown, Loader2 } from 'lucide-react';
import { addBulkProducts } from '@/lib/inventory-service';
import { useRouter } from 'next/navigation';

interface ParsedRow {
    [key: string]: any;
}

const templateData = [
    ['parent_sku', 'product_name', 'category', 'image_url', 'variant_sku', 'variant_name', 'price', 'stock'],
    ['TSHIRT-BLK', 'T-Shirt Basic Black', 'T-Shirt Oversize', 'https://placehold.co/100x100.png', 'TSHIRT-BLK-S', 'Small', 150000, 50],
    ['TSHIRT-BLK', '', '', '', 'TSHIRT-BLK-M', 'Medium', 150000, 100],
    ['TSHIRT-BLK', '', '', '', 'TSHIRT-BLK-L', 'Large', 150000, 75],
    ['HOODIE-GRY', 'Classic Hoodie Grey', 'Hoodie', 'https://placehold.co/100x100.png', 'HOODIE-GRY-L', 'Large', 350000, 30],
    ['HOODIE-GRY', '', '', '', 'HOODIE-GRY-XL', 'X-Large', 350000, 25],
    ['CAP-NAVY', 'Navy Blue Cap', 'Caps', 'https://placehold.co/100x100.png', 'CAP-NAVY-OS', 'One Size', 120000, 60]
];


export function BulkUploadForm() {
    const [data, setData] = useState<ParsedRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { fetchItems } = useInventory();
    const { toast } = useToast();
    const router = useRouter();

    const handleFileUpload = useCallback((file: File) => {
        if (!file) return;

        setIsParsing(true);
        setError(null);
        setData([]);
        setHeaders([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const workbook = XLSX.read(event.target?.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    setError('The Excel file is empty or has only a header row.');
                    setIsParsing(false);
                    return;
                }

                const fileHeaders = jsonData[0] as string[];
                const requiredHeaders = ['parent_sku', 'product_name', 'category', 'variant_sku', 'variant_name', 'price', 'stock'];
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    setError(`File is missing required headers: ${missingHeaders.join(', ')}`);
                    setIsParsing(false);
                    return;
                }

                const parsedData = XLSX.utils.sheet_to_json(worksheet);

                setHeaders(fileHeaders);
                setData(parsedData as ParsedRow[]);
            } catch (e: any) {
                 setError(`Error parsing file: ${e.message}`);
            } finally {
                setIsParsing(false);
            }
        };
        reader.onerror = (err) => {
            setError(`File reading error: ${err}`);
            setIsParsing(false);
        }
        reader.readAsBinaryString(file);
    }, []);

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "template.xlsx");
    };

    const handleSubmit = async () => {
        if (data.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No data to import',
                description: 'Please upload a valid Excel file.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Group variants by parent SKU
            const productsMap = new Map<string, any>();

            for (const row of data) {
                const parentSku = row.parent_sku;
                if (!parentSku) continue;

                if (!productsMap.has(parentSku)) {
                    productsMap.set(parentSku, {
                        sku: parentSku,
                        name: row.product_name,
                        category: row.category,
                        imageUrl: row.image_url,
                        variants: [],
                    });
                }
                
                const product = productsMap.get(parentSku)!;

                if (!product.name && row.product_name) product.name = row.product_name;
                if (!product.category && row.category) product.category = row.category;
                if (!product.imageUrl && row.image_url) product.imageUrl = row.image_url;

                product.variants.push({
                    sku: row.variant_sku,
                    name: row.variant_name,
                    price: parseFloat(row.price),
                    stock: parseInt(row.stock, 10),
                });
            }

            const productsToUpload = Array.from(productsMap.values());
            
            await addBulkProducts(productsToUpload);

            toast({
                title: 'Import Successful',
                description: `${productsToUpload.length} products with their variants have been imported.`,
            });
            await fetchItems();
            router.push('/');
        } catch (err: any) {
            console.error('Submission error:', err);
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: err.message || 'An unknown error occurred.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bulk Import Products</CardTitle>
                    <CardDescription>
                        Upload an Excel file (.xlsx) to add products and their variants at once.
                        Each row in the file represents a single product variant. Use the same `parent_sku` for all variants of the same parent product.
                        The `product_name`, `category`, and `image_url` columns only need to be filled in for the first row of each parent product.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div 
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-12 text-center hover:border-primary transition-colors"
                    >
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                             <UploadCloud className="h-12 w-12" />
                            {isParsing ? (
                                <p className="font-semibold">Parsing file...</p>
                            ) : (
                                <>
                                    <p className="font-semibold">Drag & drop your Excel file here</p>
                                    <p className="text-sm">or click to browse</p>
                                </>
                            )}
                        </div>
                    </div>
                     {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex justify-start">
                        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Download Template (.xlsx)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Data Preview</CardTitle>
                        <CardDescription>
                            Review your data before importing. A total of {data.length} rows will be processed.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <ScrollArea className="h-96 w-full">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card">
                                    <TableRow>
                                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {headers.map(header => <TableCell key={header}>{row[header]}</TableCell>)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <div className="flex justify-end mt-6">
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Confirm and Import Data'
                                )}
                            </Button>
                        </div>
                     </CardContent>
                 </Card>
            )}
        </div>
    );
}

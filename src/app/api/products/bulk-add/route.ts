

import { bulkAddProducts, addBulkImportHistory, updateBulkImportHistory, fetchBulkImportHistory } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    let historyEntryId: number | undefined;

    try {
        const body = await request.json();
        const { products, fileName } = body;

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ message: 'Product data is required.' }, { status: 400 });
        }
        
        const historyEntry = await addBulkImportHistory({
            fileName: fileName,
            date: new Date().toISOString(),
            status: 'Memproses...',
        });
        historyEntryId = historyEntry.id;

        const { addedProducts, skippedProducts } = await bulkAddProducts(products);

        await updateBulkImportHistory(historyEntry.id, {
            status: 'Berhasil',
            addedCount: addedProducts.length,
            skippedCount: skippedProducts.length,
            addedSkus: addedProducts,
            skippedSkus: skippedProducts,
        });

        return NextResponse.json({ 
            message: 'Bulk import successful',
            addedCount: addedProducts.length,
            skippedCount: skippedProducts.length,
            addedSkus: addedProducts,
            skippedSkus: skippedProducts,
        }, { status: 201 });

    } catch (error: any) {
        console.error('API Error bulk adding products:', error);
        
        if (historyEntryId) {
             await updateBulkImportHistory(historyEntryId, {
                status: 'Gagal',
                error: error.message
            });
        }

        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

export async function GET() {
  try {
    const history = await fetchBulkImportHistory();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

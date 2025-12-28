
import { bulkAddProducts, addBulkImportHistory, updateBulkImportHistory, fetchBulkImportHistory } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function POST(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

export async function GET() {
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const history = await fetchBulkImportHistory();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


import { bulkUpdateProducts } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function POST(request: NextRequest) {
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { products } = body;

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ message: 'Product data is required.' }, { status: 400 });
        }
        
        const result = await bulkUpdateProducts(products);

        return NextResponse.json({ 
            message: 'Bulk update successful',
            ...result
        }, { status: 200 });

    } catch (error: any) {
        console.error('API Error bulk updating products:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

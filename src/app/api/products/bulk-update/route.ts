
import { bulkUpdateProducts } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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


import { editVariantsBulk } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
    const { params } = await context;
    const productId = params.id;
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { variants, reason } = body;
        
        if (!Array.isArray(variants) || variants.length === 0 || !reason) {
            return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
        }
        
        await editVariantsBulk(productId, variants, reason);

        return NextResponse.json({ 
            message: 'Variants updated successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error(`API Error bulk updating variants for product ${productId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

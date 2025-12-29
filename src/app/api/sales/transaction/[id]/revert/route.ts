
import { revertSaleItem } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sku } = await request.json();
        if (!sku) {
             return NextResponse.json({ message: 'SKU is required.' }, { status: 400 });
        }
        await revertSaleItem(id, sku);
        return NextResponse.json({ message: 'Sale item reverted successfully' });
    } catch (error) {
        console.error(`API Error reverting sale item for transaction ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

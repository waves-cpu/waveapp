
import { adjustStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// ADJUST stock for a product/variant
export async function POST(request: NextRequest, context: { params: { id: string } }) {
    const { params } = await context;
    const { id } = params;
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { change, reason } = await request.json();
        if (typeof change !== 'number' || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "change" (number) and "reason" (string).' }, { status: 400 });
        }
        await adjustStock(id, change, reason);
        return NextResponse.json({ message: 'Stock adjusted successfully' });
    } catch (error) {
        console.error(`API Error adjusting stock for item ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

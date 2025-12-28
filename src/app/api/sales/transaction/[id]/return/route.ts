
import { returnSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await returnSaleTransaction(params.id);
        return NextResponse.json({ message: 'Transaction returned successfully' });
    } catch (error) {
        console.error(`API Error returning transaction ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

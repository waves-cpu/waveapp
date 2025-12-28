
import { cancelSaleTransaction, returnSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await cancelSaleTransaction(params.id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting transaction ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

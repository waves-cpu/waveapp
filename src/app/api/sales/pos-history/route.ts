
import { clearPosTransactions } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function DELETE(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateString = searchParams.get('date');

    if (!dateString) {
        return NextResponse.json({ message: 'Date parameter is required' }, { status: 400 });
    }

    try {
        await clearPosTransactions(new Date(dateString));
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('API Error clearing POS history:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { getPendingReceiptsBeforeDate } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function GET(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const beforeDateString = searchParams.get('before');

    if (!beforeDateString) {
        return NextResponse.json({ message: '`before` date parameter is required.' }, { status: 400 });
    }

    try {
        const count = await getPendingReceiptsBeforeDate(new Date(beforeDateString));
        return NextResponse.json({ count });
    } catch (error) {
        console.error('API Error getting pending receipts count:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

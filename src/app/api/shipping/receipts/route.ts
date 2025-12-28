
import { fetchShippingReceipts, addShippingReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// GET shipping receipts with filters
export async function GET(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const options = {
        page: parseInt(searchParams.get('page') || '1', 10),
        limit: parseInt(searchParams.get('limit') || '50', 10),
        salesChannel: searchParams.get('salesChannel') || undefined,
        channel: searchParams.get('channel') || undefined,
        awb: searchParams.get('awb') || undefined,
        status: searchParams.get('status')?.split(','),
        dateString: searchParams.get('date') || undefined,
    };

    try {
        const data = await fetchShippingReceipts(options);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// ADD a new shipping receipt
export async function POST(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        if (!body.awb || !body.channel || !body.salesChannel) {
            return NextResponse.json({ message: 'AWB, channel, and salesChannel are required' }, { status: 400 });
        }
        const newReceipt = await addShippingReceipt({
            ...body,
            date: new Date().toISOString(),
            status: 'Perlu Diproses'
        });
        return NextResponse.json(newReceipt, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'AWB already exists for this date.'}, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

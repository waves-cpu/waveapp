
import { checkPrintedReceiptAvailability } from '@/lib/inventory-service';
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
    const salesChannel = searchParams.get('salesChannel');
    const shippingChannel = searchParams.get('shippingChannel');
    const dateString = searchParams.get('date');

    if (!salesChannel || !shippingChannel || !dateString) {
        return NextResponse.json({ message: 'Missing required query parameters.' }, { status: 400 });
    }

    try {
        const isAvailable = await checkPrintedReceiptAvailability(salesChannel, shippingChannel, new Date(dateString));
        return NextResponse.json({ isAvailable });
    } catch (error) {
        console.error('API Error checking printed receipt availability:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

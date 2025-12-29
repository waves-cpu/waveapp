
import { checkPrintedReceiptAvailability } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const salesChannel = searchParams.get('salesChannel');
    const shippingChannel = searchParams.get('shippingChannel');
    const dateString = searchParams.get('date');

    if (!salesChannel || !shippingChannel || !dateString) {
        return NextResponse.json({ message: 'Missing required query parameters.' }, { status: 400 });
    }

    try {
        const isAvailable = await checkPrintedReceiptAvailability(salesChannel, shippingChannel, dateString);
        return NextResponse.json({ isAvailable });
    } catch (error) {
        console.error('API Error checking printed receipt availability:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

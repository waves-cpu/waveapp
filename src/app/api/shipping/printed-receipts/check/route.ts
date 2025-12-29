
import { checkPrintedReceiptAvailability } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { salesChannel, shippingChannel, date } = body;

        if (!salesChannel || !shippingChannel || !date) {
            return NextResponse.json({ message: 'Missing required body parameters.' }, { status: 400 });
        }

        const isAvailable = await checkPrintedReceiptAvailability(salesChannel, shippingChannel, date);
        return NextResponse.json({ isAvailable });
    } catch (error) {
        console.error('API Error checking printed receipt availability:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

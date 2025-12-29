
import { addPrintedReceipts, getPrintedReceiptCountsForDate } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ message: 'Date parameter is required.' }, { status: 400 });
    }

    try {
        const counts = await getPrintedReceiptCountsForDate(date);
        return NextResponse.json(counts);
    } catch (error) {
        console.error('API Error fetching printed receipt counts:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, salesChannel, shippingChannel, count } = body;
        if (!date || !salesChannel || !shippingChannel || !count) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        await addPrintedReceipts(date, salesChannel, shippingChannel, count);
        return NextResponse.json({ message: 'Printed receipts count added successfully.' }, { status: 201 });
    } catch (error) {
        console.error('API Error adding printed receipts count:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

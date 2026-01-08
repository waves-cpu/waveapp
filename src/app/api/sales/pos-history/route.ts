
import { clearPosTransactions, getPosSalesByDate } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ message: 'Date parameter is required' }, { status: 400 });
    }

    try {
        const sales = await getPosSalesByDate(new Date(date));
        return NextResponse.json(sales);
    } catch (error) {
        console.error('API Error fetching POS history:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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

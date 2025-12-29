
import { clearPosTransactions } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

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

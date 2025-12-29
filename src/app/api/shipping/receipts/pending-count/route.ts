
import { getPendingReceiptsBeforeDate } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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


import { returnSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
        }
        await returnSaleTransaction(id);
        return NextResponse.json({ message: 'Transaction returned successfully' });
    } catch (error) {
        console.error(`API Error returning transaction:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

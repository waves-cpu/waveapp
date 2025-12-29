
import { returnSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;

    try {
        await returnSaleTransaction(id);
        return NextResponse.json({ message: 'Transaction returned successfully' });
    } catch (error) {
        console.error(`API Error returning transaction ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

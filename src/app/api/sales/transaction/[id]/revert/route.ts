
import { revertSaleItem } from '@/lib/inventory-service';
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

        const { sku } = await request.json();
        if (!sku) {
             return NextResponse.json({ message: 'SKU is required.' }, { status: 400 });
        }
        await revertSaleItem(id, sku);
        return NextResponse.json({ message: 'Sale item reverted successfully' });
    } catch (error) {
        console.error(`API Error reverting sale item for transaction:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

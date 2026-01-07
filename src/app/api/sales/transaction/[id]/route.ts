
import { getSalesByTransactionId, cancelSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET sales by transactionId
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
    }

    const sales = await getSalesByTransactionId(id);
    if (sales.length > 0) {
      return NextResponse.json({ sales });
    }
    return NextResponse.json({ message: 'No sales found for this transaction ID' }, { status: 404 });
  } catch (error) {
    console.error(`API Error fetching sales for transaction:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Transaction ID is required' }, { status: 400 });
        }

        await cancelSaleTransaction(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting transaction:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

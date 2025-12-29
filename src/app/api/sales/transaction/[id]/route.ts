
import { getSalesByTransactionId, cancelSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// GET sales by transactionId
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const sales = await getSalesByTransactionId(id);
    if (sales.length > 0) {
      return NextResponse.json({ sales });
    }
    return NextResponse.json({ message: 'No sales found for this transaction ID' }, { status: 404 });
  } catch (error) {
    console.error(`API Error fetching sales for transaction ${id}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;

    try {
        await cancelSaleTransaction(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting transaction ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

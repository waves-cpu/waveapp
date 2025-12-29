
import { getSalesByTransactionId, cancelSaleTransaction, returnSaleTransaction } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// GET sales by transactionId
export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const { params } = await context;
  const { id } = params;
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');
  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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


export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
    const { params } = await context;
    const { id } = params;
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await cancelSaleTransaction(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting transaction ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { fetchShippingReceiptCounts } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
        dateString: searchParams.get('date') || undefined,
        salesChannel: searchParams.get('salesChannel') || undefined,
        shippingChannel: searchParams.get('shippingChannel') || undefined,
        status: searchParams.getAll('status'), // Use getAll to ensure it's always an array
    };

    const counts = await fetchShippingReceiptCounts(options);
    return NextResponse.json(counts);
  } catch (error: any) {
    console.error('API Error fetching receipt counts:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

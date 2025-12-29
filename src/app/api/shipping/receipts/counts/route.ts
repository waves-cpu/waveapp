
import { fetchShippingReceiptCounts } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
        dateString: searchParams.get('date') || undefined,
        salesChannel: searchParams.get('salesChannel') || undefined,
        shippingChannel: searchParams.get('shippingChannel') || undefined,
        status: searchParams.get('status') || undefined,
    };

    const counts = await fetchShippingReceiptCounts(options);
    return NextResponse.json(counts);
  } catch (error) {
    console.error('API Error fetching receipt counts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

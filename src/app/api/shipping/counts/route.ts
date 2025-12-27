
import { getReceiptCountByStatus } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    if (!status) {
        return NextResponse.json({ message: 'Status parameter is required' }, { status: 400 });
    }

    const counts = await getReceiptCountByStatus(status);
    return NextResponse.json(counts);
  } catch (error) {
    console.error('API Error fetching receipt counts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

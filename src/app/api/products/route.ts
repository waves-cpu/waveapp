
import { fetchInventoryData } from '@/lib/inventory-service';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const headersList = headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== (process.env.API_KEY || 'secret-api-key-for-waveapp')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items, accessories } = await fetchInventoryData();
    
    return NextResponse.json({ products: items, accessories });
  } catch (error) {
    console.error('API Error fetching products:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

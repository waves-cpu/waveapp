
import { fetchInventoryData, addProduct } from '@/lib/inventory-service';
import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function GET() {
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
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

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const newItemId = await addProduct(body);
    return NextResponse.json({ id: newItemId, message: 'Product added successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error adding product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

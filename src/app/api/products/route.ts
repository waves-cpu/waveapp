
import { fetchInventoryData, addProduct } from '@/lib/inventory-service';
import { NextResponse, NextRequest } from 'next/server';

export async function GET() {
  try {
    const { items, accessories } = await fetchInventoryData();
    
    return NextResponse.json({ products: items, accessories });
  } catch (error) {
    console.error('API Error fetching products:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newItemId = await addProduct(body);
    return NextResponse.json({ id: newItemId, message: 'Product added successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error adding product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

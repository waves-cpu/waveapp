
import { fetchInventoryData, addProduct, addAccessory } from '@/lib/inventory-service';
import { NextResponse, NextRequest } from 'next/server';

export async function GET() {
  try {
    const { items, accessories } = await fetchInventoryData();
    
    return NextResponse.json({ products: items, accessories });
  } catch (error: any) {
    console.error('API Error fetching products:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
        return NextResponse.json({ message: "Item name is required" }, { status: 400 });
    }

    // Check if the request is for an accessory
    if (body.type === 'accessory') {
        const newAccessoryId = await addAccessory(body);
        return NextResponse.json({ id: newAccessoryId, message: 'Accessory added successfully' }, { status: 201 });
    }

    // Otherwise, treat as a product
    const newItemId = await addProduct(body);
    return NextResponse.json({ id: newItemId, message: 'Product added successfully' }, { status: 201 });
  } catch (error: any) {
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('API Error adding item:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

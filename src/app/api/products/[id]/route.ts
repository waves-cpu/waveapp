
import { fetchSingleItem, editProduct, deleteProductPermanently } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// GET a single product
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');
  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const item = await fetchSingleItem(params.id);
    if (item) {
      return NextResponse.json(item);
    }
    return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE a product
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        await editProduct(params.id, body);
        return NextResponse.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error(`API Error updating product ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a product
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await deleteProductPermanently(params.id);
        return NextResponse.json({ message: 'Product deleted permanently' });
    } catch (error) {
        console.error(`API Error deleting product ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

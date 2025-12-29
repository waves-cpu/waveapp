
import { fetchSingleItem, editProduct, deleteProductPermanently } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// GET a single product
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const item = await fetchSingleItem(id);
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
    const { id } = params;

    try {
        const body = await request.json();
        await editProduct(id, body);
        return NextResponse.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error(`API Error updating product ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a product
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;

    try {
        await deleteProductPermanently(id);
        return NextResponse.json({ message: 'Product deleted permanently' });
    } catch (error) {
        console.error(`API Error deleting product ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

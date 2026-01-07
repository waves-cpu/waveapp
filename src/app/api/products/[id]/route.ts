
import { fetchSingleItem, editProduct, deleteProductPermanently, archiveProduct } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET a single product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }
    const item = await fetchSingleItem(id);
    if (item) {
      return NextResponse.json(item);
    }
    return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error fetching product:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE a product or accessory
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
        }
        
        const body = await request.json();
        
        if (typeof body.isArchived === 'boolean') {
             await archiveProduct(id, body.isArchived);
             return NextResponse.json({ message: 'Product archive status updated' });
        }

        await editProduct(id, body);
        return NextResponse.json({ message: 'Item updated successfully' });

    } catch (error: any) {
        console.error(`API Error updating item:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


// DELETE a product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
        }
        await deleteProductPermanently(id);
        return NextResponse.json({ message: 'Product deleted permanently' });
    } catch (error: any) {
        console.error(`API Error deleting product ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

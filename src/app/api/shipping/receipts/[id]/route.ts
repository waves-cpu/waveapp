
import { fetchSingleShippingReceipt, updateShippingReceiptStatus, deleteShippingReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// GET a single shipping receipt
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const headersList = headers();
  const apiKey = headersList.get('X-API-Key');
  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid receipt ID' }, { status: 400 });
    }
    const receipt = await fetchSingleShippingReceipt(id);
    if (receipt) {
      return NextResponse.json(receipt);
    }
    return NextResponse.json({ message: 'Receipt not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// UPDATE a shipping receipt (e.g., its status)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id, 10);
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid receipt ID' }, { status: 400 });
        }
        const body = await request.json();
        const { status } = body;
        if (!status) {
            return NextResponse.json({ message: 'Status is required' }, { status: 400 });
        }

        await updateShippingReceiptStatus(id, status);
        return NextResponse.json({ message: 'Receipt status updated successfully' });
    } catch (error: any) {
        console.error(`API Error updating receipt ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a shipping receipt
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id, 10);
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid receipt ID' }, { status: 400 });
        }
        await deleteShippingReceipt(id);
        return NextResponse.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error(`API Error deleting receipt ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

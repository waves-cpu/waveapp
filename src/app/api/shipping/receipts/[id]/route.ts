
import { fetchSingleShippingReceipt, updateShippingReceiptStatus, deleteShippingReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { sseChannel } from '@/lib/sse-channel';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET a single shipping receipt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    
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
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid receipt ID' }, { status: 400 });
        }
        const body = await request.json();
        const { status, userId, username } = body;
        if (!status) {
            return NextResponse.json({ message: 'Status is required' }, { status: 400 });
        }

        await updateShippingReceiptStatus(id, status, userId, username);
        sseChannel.postMessage({ type: 'receipt-update' });

        return NextResponse.json({ message: 'Receipt status updated successfully' });
    } catch (error: any) {
        console.error(`API Error updating receipt:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a shipping receipt
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid receipt ID' }, { status: 400 });
        }
        await deleteShippingReceipt(id);
        sseChannel.postMessage({ type: 'receipt-update' });
        return NextResponse.json({ message: 'Receipt deleted successfully' });
    } catch (error) {
        console.error(`API Error deleting receipt:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

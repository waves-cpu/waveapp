
import { updateShippingReceiptsStatus } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// UPDATE status for multiple receipts
export async function PUT(request: NextRequest) {
    try {
        const { ids, status } = await request.json();
        if (!Array.isArray(ids) || ids.length === 0 || !status) {
            return NextResponse.json({ message: 'Invalid request body, requires "ids" (array) and "status" (string).' }, { status: 400 });
        }
        await updateShippingReceiptsStatus(ids, status);
        return NextResponse.json({ message: `Successfully updated ${ids.length} receipts to "${status}".` });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

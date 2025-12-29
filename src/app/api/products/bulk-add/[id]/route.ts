
import { deleteBulkImportHistory } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// DELETE a bulk import history entry
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id, 10);

    try {
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid history ID' }, { status: 400 });
        }
        await deleteBulkImportHistory(id);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`API Error deleting import history ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { deleteBulkImportHistory } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// DELETE a bulk import history entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid history ID' }, { status: 400 });
        }
        await deleteBulkImportHistory(id);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`API Error deleting import history:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

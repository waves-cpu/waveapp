
import { deleteBulkImportHistory } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// DELETE a bulk import history entry
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
    const { params } = await context;
    const id = parseInt(params.id, 10);
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

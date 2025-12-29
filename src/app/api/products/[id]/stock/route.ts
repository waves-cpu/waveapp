
import { adjustStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// ADJUST stock for a product/variant
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;

    try {
        const { change, reason } = await request.json();
        if (typeof change !== 'number' || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "change" (number) and "reason" (string).' }, { status: 400 });
        }
        await adjustStock(id, change, reason);
        return NextResponse.json({ message: 'Stock adjusted successfully' });
    } catch (error) {
        console.error(`API Error adjusting stock for item ${id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { adjustStock, adjustAccessoryStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// ADJUST stock for a product/variant or accessory
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;

    try {
        const { change, reason, type } = await request.json();
        
        if (typeof change !== 'number' || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "change" (number) and "reason" (string).' }, { status: 400 });
        }

        if (type === 'accessory') {
            await adjustAccessoryStock(id, change, reason);
            return NextResponse.json({ message: 'Accessory stock adjusted successfully' });
        } else {
            await adjustStock(id, change, reason);
            return NextResponse.json({ message: 'Product stock adjusted successfully' });
        }

    } catch (error: any) {
        console.error(`API Error adjusting stock for item ${id}:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

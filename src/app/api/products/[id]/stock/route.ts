
import { adjustStock, adjustAccessoryStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// ADJUST stock for a product/variant or accessory
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Item ID is required' }, { status: 400 });
        }

        const { change, reason, type, userId, username } = await request.json();
        
        if (typeof change !== 'number' || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "change" (number) and "reason" (string).' }, { status: 400 });
        }

        if (type === 'accessory') {
            await adjustAccessoryStock(id, change, reason, userId, username);
            return NextResponse.json({ message: 'Accessory stock adjusted successfully' });
        } else {
            await adjustStock(id, change, reason, userId, username);
            return NextResponse.json({ message: 'Product stock adjusted successfully' });
        }

    } catch (error: any) {
        console.error(`API Error adjusting stock:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

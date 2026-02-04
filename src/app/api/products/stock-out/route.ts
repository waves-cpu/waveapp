
import { bulkAdjustStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, reason, userId, username } = body;

        if (!Array.isArray(items) || items.length === 0 || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "items" (array) and "reason" (string).' }, { status: 400 });
        }
        
        // For stock out, we ensure the quantities are negative.
        const updates = items.map((item: { itemId: string, quantity: number }) => ({
            itemId: item.itemId,
            quantity: -Math.abs(item.quantity)
        }));

        await bulkAdjustStock(updates, reason, userId, username);

        return NextResponse.json({ 
            message: 'Stock updated successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error(`API Error bulk adjusting stock for stock-out:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

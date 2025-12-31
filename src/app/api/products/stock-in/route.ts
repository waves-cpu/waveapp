
import { bulkAdjustStock } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, reason } = body;

        if (!Array.isArray(items) || items.length === 0 || !reason) {
            return NextResponse.json({ message: 'Invalid request body, requires "items" (array) and "reason" (string).' }, { status: 400 });
        }
        
        // The service function expects quantity to be the change, so we map it.
        const updates = items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity
        }));

        await bulkAdjustStock(updates, reason);

        return NextResponse.json({ 
            message: 'Stock updated successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error(`API Error bulk adjusting stock:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

    

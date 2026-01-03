
import { getActiveDiscountPrice } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, variantId, category, channel } = body;

        if (!productId || !category || !channel) {
            return NextResponse.json({ message: 'Missing required parameters.' }, { status: 400 });
        }

        const price = await getActiveDiscountPrice(productId, variantId || null, category, channel);

        return NextResponse.json({ price });
    } catch (error) {
        console.error('API Error fetching active discount price:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { getActiveDiscountPrice } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, variantId, category, channel } = body;

        if (!productId || !category || !channel) {
            return NextResponse.json({ message: 'Missing required parameters (productId, category, channel).' }, { status: 400 });
        }

        const price = await getActiveDiscountPrice(productId, variantId || null, category, channel);

        // Even if the price is null (no discount), it's a successful response.
        return NextResponse.json({ price });

    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        console.error('API Error fetching active discount price:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

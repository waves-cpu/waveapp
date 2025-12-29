
import { editVariantsBulk } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const productId = params.id;

    try {
        const body = await request.json();
        const { variants, reason } = body;
        
        if (!Array.isArray(variants) || variants.length === 0 || !reason) {
            return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
        }
        
        await editVariantsBulk(productId, variants, reason);

        return NextResponse.json({ 
            message: 'Variants updated successfully'
        }, { status: 200 });

    } catch (error: any) {
        console.error(`API Error bulk updating variants for product ${productId}:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

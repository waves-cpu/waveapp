
import { editVariantsBulk } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId } = await params;
        if (!productId) {
            return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
        }
        
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
        console.error(`API Error bulk updating variants:`, error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}

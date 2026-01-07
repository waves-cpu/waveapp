
import { getDiscountGroup, editDiscountGroup, deleteDiscountGroup } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const group = await getDiscountGroup(id);
        if (group) {
            return NextResponse.json(group);
        }
        return NextResponse.json({ message: 'Discount group not found' }, { status: 404 });
    } catch (error) {
        console.error(`API Error fetching discount group:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const body = await request.json();
        await editDiscountGroup(id, body);
        return NextResponse.json({ message: 'Discount group updated successfully' });
    } catch (error) {
        console.error(`API Error updating discount group:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        await deleteDiscountGroup(id);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`API Error deleting discount group:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

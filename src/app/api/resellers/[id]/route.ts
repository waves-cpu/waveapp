import { getResellerById, updateReseller, deleteReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const reseller = await getResellerById(id);
        if (reseller) {
            return NextResponse.json(reseller);
        }
        return NextResponse.json({ message: 'Reseller not found' }, { status: 404 });
    } catch (error) {
        console.error(`API Error fetching reseller:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        
        const body = await request.json();
        const updatedReseller = await updateReseller(id, body);
        return NextResponse.json(updatedReseller);
    } catch (error: any) {
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

        await deleteReseller(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`API Error deleting reseller:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

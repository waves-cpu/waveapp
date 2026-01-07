
import { editReseller, deleteReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// UPDATE a reseller
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        const body = await request.json();
        const updatedReseller = await editReseller(id, body);
        return NextResponse.json(updatedReseller);
    } catch (error: any) {
         if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'Reseller with this name already exists.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a reseller
export async function DELETE(request: NextRequest, { params }: RouteParams) {
     try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        await deleteReseller(id);
        return NextResponse.json({ message: 'Reseller deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

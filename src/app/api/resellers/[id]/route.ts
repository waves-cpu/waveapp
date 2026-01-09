
import { editReseller, deleteReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: { id: string };
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        
        const body = await request.json();
        const { name, phone, address } = body;
        if (!name) {
            return NextResponse.json({ message: 'Reseller name is required' }, { status: 400 });
        }

        const updatedReseller = await editReseller(id, { name, phone, address });
        return NextResponse.json(updatedReseller);
    } catch (error: any) {
         if (error.message.includes('Reseller name already exists')) {
            return NextResponse.json({ message: error.message }, { status: 409 });
        }
        console.error(`API Error updating reseller ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        await deleteReseller(id);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error: any) {
        console.error(`API Error deleting reseller ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

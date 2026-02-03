
import { updateEmployee, deleteEmployee } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
        
        const body = await request.json();
        const updated = await updateEmployee(id, body);
        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        await deleteEmployee(id);
        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

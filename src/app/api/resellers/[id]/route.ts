
import { editReseller, deleteReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// UPDATE a reseller
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id, 10);
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        const body = await request.json();
        const updatedReseller = await editReseller(id, body);
        return NextResponse.json(updatedReseller);
    } catch (error: any) {
         if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'Reseller with this name already exists.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a reseller
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id, 10);
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (isNaN(id)) {
            return NextResponse.json({ message: 'Invalid reseller ID' }, { status: 400 });
        }
        await deleteReseller(id);
        return NextResponse.json({ message: 'Reseller deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

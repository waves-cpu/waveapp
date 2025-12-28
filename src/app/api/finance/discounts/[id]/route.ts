
import { getDiscountGroup, editDiscountGroup, deleteDiscountGroup } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = parseInt((await params).id, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const group = await getDiscountGroup(id);
        if (group) {
            return NextResponse.json(group);
        }
        return NextResponse.json({ message: 'Discount group not found' }, { status: 404 });
    } catch (error) {
        console.error(`API Error fetching discount group ${(await params).id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const id = parseInt((await params).id, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const body = await request.json();
        await editDiscountGroup(id, body);
        return NextResponse.json({ message: 'Discount group updated successfully' });
    } catch (error) {
        console.error(`API Error updating discount group ${(await params).id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    try {
        const id = parseInt((await params).id, 10);
        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        await deleteDiscountGroup(id);
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`API Error deleting discount group ${(await params).id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

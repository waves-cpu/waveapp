
import { fetchDiscountGroups, addDiscountGroup } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

export async function GET() {
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    try {
        const groups = await fetchDiscountGroups();
        return NextResponse.json(groups);
    } catch (error) {
        console.error('API Error fetching discount groups:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const headersList = headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        await addDiscountGroup(body);
        return NextResponse.json({ message: 'Discount group added successfully' }, { status: 201 });
    } catch (error) {
        console.error('API Error adding discount group:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { fetchDiscountGroups, addDiscountGroup } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const groups = await fetchDiscountGroups();
        return NextResponse.json(groups);
    } catch (error) {
        console.error('API Error fetching discount groups:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await addDiscountGroup(body);
        return NextResponse.json({ message: 'Discount group added successfully' }, { status: 201 });
    } catch (error) {
        console.error('API Error adding discount group:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

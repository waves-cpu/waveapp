
import { fetchDiscountGroups, addDiscountGroup } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const groups = await fetchDiscountGroups();
        return NextResponse.json(groups);
    } catch (error: any) {
        console.error('API Error fetching discount groups:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Add more robust validation here if needed
        if (!body.name || !body.category || !body.channel || !body.startDate || !body.endDate) {
            return NextResponse.json({ message: 'Missing required fields for discount group.' }, { status: 400 });
        }
        await addDiscountGroup(body);
        return NextResponse.json({ message: 'Discount group added successfully' }, { status: 201 });
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        console.error('API Error adding discount group:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

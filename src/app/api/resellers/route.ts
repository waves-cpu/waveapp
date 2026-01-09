
import { getResellers, addReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const resellers = await getResellers();
        return NextResponse.json(resellers);
    } catch (error: any) {
        console.error('API Error fetching resellers:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, address } = body;
        if (!name) {
            return NextResponse.json({ message: 'Reseller name is required' }, { status: 400 });
        }
        const newReseller = await addReseller(name, phone, address);
        return NextResponse.json(newReseller, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('Reseller name already exists')) {
            return NextResponse.json({ message: error.message }, { status: 409 });
        }
        console.error('API Error adding reseller:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

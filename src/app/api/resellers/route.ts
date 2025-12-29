
import { getResellers, addReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// GET all resellers
export async function GET() {
    try {
        const resellers = await getResellers();
        return NextResponse.json(resellers);
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// ADD a new reseller
export async function POST(request: NextRequest) {
    try {
        const { name, phone, address } = await request.json();
        if (!name) {
            return NextResponse.json({ message: 'Reseller name is required' }, { status: 400 });
        }
        const newReseller = await addReseller(name, phone, address);
        return NextResponse.json(newReseller, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'Reseller with this name already exists.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

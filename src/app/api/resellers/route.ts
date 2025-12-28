
import { getResellers, addReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// GET all resellers
export async function GET() {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const resellers = await getResellers();
        return NextResponse.json(resellers);
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// ADD a new reseller
export async function POST(request: NextRequest) {
    const headersList = await headers();
    const apiKey = headersList.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

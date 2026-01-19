import { fetchResellers, addReseller } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const resellers = await fetchResellers();
        return NextResponse.json(resellers);
    } catch (error) {
        console.error("API Error fetching resellers:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.name) {
            return NextResponse.json({ message: 'Reseller name is required' }, { status: 400 });
        }
        const newReseller = await addReseller(body);
        return NextResponse.json(newReseller, { status: 201 });
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


import { saveSetting } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { key, value } = await request.json();
        if (!key || value === undefined) {
            return NextResponse.json({ message: 'Key and value are required' }, { status: 400 });
        }
        await saveSetting(key, value);
        return NextResponse.json({ message: 'Setting saved' }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

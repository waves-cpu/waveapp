
import { getSetting } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
    try {
        const setting = await getSetting(params.key);
        if (setting) {
            return NextResponse.json(setting);
        }
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

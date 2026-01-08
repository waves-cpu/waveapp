
import { getVoucherUsageAnalytics } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const analytics = await getVoucherUsageAnalytics(id);
        
        return NextResponse.json(analytics);

    } catch (error: any) {
        console.error(`API Error fetching voucher analytics:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

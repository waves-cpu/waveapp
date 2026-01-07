
import { findDiscountGroupByVoucherCode } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { code } = await params;
        const { searchParams } = new URL(request.url);
        const channel = searchParams.get('channel');
        
        if (!code) {
            return NextResponse.json({ message: 'Voucher code is required' }, { status: 400 });
        }
        if (!channel) {
            return NextResponse.json({ message: 'Channel parameter is required.' }, { status: 400 });
        }
        
        const group = await findDiscountGroupByVoucherCode(code, channel);
        if (group) {
            return NextResponse.json(group);
        }
        return NextResponse.json({ message: 'Voucher tidak valid atau tidak ditemukan.' }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

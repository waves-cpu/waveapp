
import { findDiscountGroupByVoucherCode } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    
    if (!channel) {
        return NextResponse.json({ message: 'Channel parameter is required.' }, { status: 400 });
    }
    
    try {
        const group = await findDiscountGroupByVoucherCode(params.code, channel);
        if (group) {
            return NextResponse.json(group);
        }
        return NextResponse.json({ message: 'Voucher tidak valid atau tidak ditemukan.' }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

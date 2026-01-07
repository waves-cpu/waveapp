
import { fetchShippingReceipts, addShippingReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// GET shipping receipts with filters
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    
    // Gunakan try-catch untuk menangani potensi error pada saat parsing params
    try {
        const options = {
            page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
            limit: Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
            salesChannel: searchParams.get('salesChannel') || undefined,
            channel: searchParams.get('channel') || undefined,
            awb: searchParams.get('awb') || undefined,
            // Perbaikan: Pastikan split tidak error jika status kosong
            status: searchParams.get('status') ? searchParams.get('status')?.split(',') : undefined,
            dateString: searchParams.get('dateString') || undefined,
        };

        const data = await fetchShippingReceipts(options);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('GET Shipping Receipts Error:', error);
        return NextResponse.json(
            { message: 'Gagal mengambil data pengiriman' }, 
            { status: 500 }
        );
    }
}

// ADD a new shipping receipt
export async function POST(request: NextRequest) {
    try {
        // Validasi apakah body ada
        const body = await request.json();

        // 1. Validasi Input Dasar
        if (!body.awb || !body.channel || !body.salesChannel) {
            return NextResponse.json(
                { message: 'AWB, channel, dan salesChannel wajib diisi' }, 
                { status: 400 }
            );
        }

        // 2. Proses penambahan data
        const newReceipt = await addShippingReceipt({
            ...body,
            date: new Date().toISOString(),
            status: 'Perlu Diproses'
        });

        return NextResponse.json(newReceipt, { status: 201 });

    } catch (error: any) {
        console.error('POST Shipping Receipt Error:', error);

        // 3. Handling Duplicate AWB (Custom Error dari service)
        if (error.message?.startsWith('DUPLICATE_AWB::')) {
            const cleanMessage = error.message.split('::')[1];
            return NextResponse.json({ message: cleanMessage }, { status: 409 }); // 409 Conflict
        }

        // 4. Handling Invalid JSON
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Format JSON tidak valid' }, { status: 400 });
        }

        return NextResponse.json(
            { message: 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}

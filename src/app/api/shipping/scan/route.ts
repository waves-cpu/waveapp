

import { findShippingReceiptByAwb, updateShippingReceiptStatus } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { sseChannel } from '@/lib/sse-channel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { awb, channel, userId, username } = body;

    if (!awb || !channel) {
        return NextResponse.json({ message: 'AWB and channel are required' }, { status: 400 });
    }

    const receipt = await findShippingReceiptByAwb(awb);

    if (!receipt) {
        return NextResponse.json({ message: 'Resi tidak ditemukan di sistem.' }, { status: 404 });
    }

    if (receipt.channel.toUpperCase() !== channel.toUpperCase()) {
        return NextResponse.json({ message: `Resi ini untuk ${receipt.channel}, bukan ${channel}.` }, { status: 400 });
    }

    if (receipt.status !== 'Terproses') {
        if (receipt.status === 'Siap Kirim') {
            return NextResponse.json({ message: 'Resi ini sudah siap kirim.' }, { status: 400 });
        }
        return NextResponse.json({ message: `Status resi saat ini adalah "${receipt.status}", tidak bisa diubah.` }, { status: 400 });
    }

    await updateShippingReceiptStatus(receipt.id, 'Siap Kirim', userId, username);
    sseChannel.postMessage({ type: 'receipt-update' });
    
    const updatedReceipt = { ...receipt, status: 'Siap Kirim' };
    
    return NextResponse.json({ message: 'Berhasil diubah menjadi "Siap Kirim".', receipt: updatedReceipt });

  } catch (error) {
    console.error('API Error processing AWB:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

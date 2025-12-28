
'use client';

import { recordSaleWithReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ShippingReceipt, Sale } from '@/types';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// Handler for POST requests to record a new online sale with its receipt
export async function POST(request: NextRequest) {
  const headersList = await headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { receipt, sales } = body;

    // Validate receipt data
    if (!receipt || !receipt.awb || !receipt.salesChannel || !receipt.channel) {
      return NextResponse.json({ message: 'Receipt data is incomplete.' }, { status: 400 });
    }

    // Validate sales data
    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ message: 'Sales data is required and must be an array.' }, { status: 400 });
    }

    const receiptData: Omit<ShippingReceipt, 'id'> = {
        awb: receipt.awb,
        salesChannel: receipt.salesChannel,
        channel: receipt.channel,
        date: new Date().toISOString(),
        status: 'Terproses',
        transactionId: receipt.awb, // Use AWB as transactionId
    };

    const salesData: Omit<Sale, 'id'>[] = sales.map((sale: any) => ({
        transactionId: receipt.awb,
        sku: sale.sku,
        channel: receipt.salesChannel,
        quantity: sale.quantity,
        priceAtSale: sale.price,
        saleDate: receiptData.date,
        status: 'Terproses',
    }));

    await recordSaleWithReceipt(receiptData, salesData);

    return NextResponse.json({ message: 'Online sale recorded successfully', data: { receipt: receiptData, sales: salesData } }, { status: 201 });

  } catch (error: any) {
    console.error('API Error recording online sale:', error);
    // Provide more specific error messages if possible
    if (error.message.includes('Jumlah resi yang dipindai melebihi jumlah yang dicetak oleh admin')) {
        return NextResponse.json({ message: error.message }, { status: 429 }); // 429 Too Many Requests
    }
     if (error.message.includes('Insufficient stock')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error.message.includes('SKU not found')) {
        return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

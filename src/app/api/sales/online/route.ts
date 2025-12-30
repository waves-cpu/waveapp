

import { recordSaleWithReceipt } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import type { ShippingReceipt, Sale } from '@/types';
import { format } from 'date-fns';

// Handler for POST requests to record a new online sale with its receipt
export async function POST(request: NextRequest) {
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
        priceAtSale: sale.priceAtSale, // CORRECTED THIS LINE
        saleDate: receiptData.date,
        status: 'Terproses',
        productId: sale.productId,
        variantId: sale.variantId,
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

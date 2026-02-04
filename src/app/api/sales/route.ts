

import { performSale, fetchAllSales } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// Handler for GET requests to fetch sales data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    const allSales = await fetchAllSales();

    if (startDateParam && endDateParam) {
        const startDate = parseISO(startDateParam);
        const endDate = parseISO(endDateParam);
        const filteredSales = allSales.filter(sale => {
            const saleDate = parseISO(sale.saleDate);
            // This logic is now correct for inclusive date range filtering
            return saleDate >= startOfDay(startDate) && saleDate <= endOfDay(endDate);
        });
        return NextResponse.json({ sales: filteredSales });
    }

    return NextResponse.json({ sales: allSales });
  } catch (error) {
    console.error('API Error fetching sales:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler for POST requests to record a new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sales, options, userId, username } = body;

    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ message: 'Sales data is required and must be an array.' }, { status: 400 });
    }

    const transactionId = options?.transactionId || `trans-${Date.now()}`;
    // The performSale function now accepts a sales array directly
    // The frontend is now responsible for sending the correct priceAtSale
    const results = await performSale(options.channel, {
        ...options,
        sales: sales, // Pass sales directly without re-mapping
        transactionId: transactionId,
        userId,
        username,
    });

    return NextResponse.json({ message: 'Sale recorded successfully', data: results }, { status: 201 });

  } catch (error: any) {
    console.error('API Error recording sale:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

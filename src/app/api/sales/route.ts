
import { recordSale, fetchAllSales } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const API_KEY = process.env.API_KEY || 'secret-api-key-for-waveapp';

// Handler for GET requests to fetch sales data
export async function GET(request: NextRequest) {
  const headersList = headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    const allSales = await fetchAllSales();

    const filteredSales = allSales.filter(sale => {
      if (startDateParam && endDateParam) {
        const saleDate = parseISO(sale.saleDate);
        const startDate = startOfDay(parseISO(startDateParam));
        const endDate = endOfDay(parseISO(endDateParam));
        return isWithinInterval(saleDate, { start: startDate, end: endDate });
      }
      return true; // If no date range, return all sales
    });

    return NextResponse.json({ sales: filteredSales });
  } catch (error) {
    console.error('API Error fetching sales:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Handler for POST requests to record a new sale
export async function POST(request: NextRequest) {
  const headersList = headers();
  const apiKey = headersList.get('X-API-Key');

  if (apiKey !== API_KEY) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sales, options } = body;

    if (!Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ message: 'Sales data is required and must be an array.' }, { status: 400 });
    }

    const transactionId = options?.transactionId || `trans-${Date.now()}`;
    const salePromises = sales.map((sale: any) => 
      recordSale(sale.sku, sale.channel, sale.quantity, {
        ...options,
        transactionId: transactionId,
        priceAtSale: sale.price,
      })
    );

    const results = await Promise.all(salePromises);

    return NextResponse.json({ message: 'Sale recorded successfully', data: results }, { status: 201 });

  } catch (error: any) {
    console.error('API Error recording sale:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

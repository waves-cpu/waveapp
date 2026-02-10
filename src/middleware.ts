
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_KEY = process.env.API_KEY;

export function middleware(request: NextRequest) {
  // Hanya jalankan middleware untuk path /api/*
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('X-API-Key');

    if (apiKey !== API_KEY) {
      return new NextResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

// Tentukan path mana yang akan dijalankan oleh middleware
export const config = {
  matcher: '/api/:path*',
};

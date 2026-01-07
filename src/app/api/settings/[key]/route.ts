import { getSetting } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

// 1. Definisikan tipe params sebagai Promise (Standar Next.js 15)
type RouteParams = {
  params: Promise<{ key: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // 2. Await params sebelum digunakan
        const { key } = await params;

        // Validasi jika key kosong (opsional tapi disarankan)
        if (!key) {
            return NextResponse.json({ message: 'Key is required' }, { status: 400 });
        }

        const setting = await getSetting(key);

        if (setting) {
            return NextResponse.json(setting);
        }

        /**
         * 3. Penjelasan 204 No Content:
         * Secara spek HTTP, 204 tidak boleh mengirimkan body (null).
         * Jika kamu ingin frontend mendapatkan 'null' secara eksplisit sebagai JSON,
         * gunakan 404 (Not Found) atau kembalikan json(null).
         */
        return new NextResponse(null, { status: 204 }); 
        
    } catch (error: any) {
        console.error('API Error:', error); // Log error di server untuk debugging
        return NextResponse.json(
            { message: error.message || 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}

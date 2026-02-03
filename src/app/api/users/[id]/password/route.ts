
import { updateUserPassword as updateUserPasswordInDb } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const userId = parseInt(idStr, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 });
        }
        
        const body = await request.json();
        const { password } = body;
        
        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ message: 'Password must be a string of at least 6 characters.' }, { status: 400 });
        }

        await updateUserPasswordInDb(userId, password);
        
        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (error: any) {
        console.error("API Error updating password:", error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

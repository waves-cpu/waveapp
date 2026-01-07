
import { authenticateUser } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
        }
        const user = await authenticateUser(username, password);
        if (user) {
            // Important: Do not send the password back to the client
            const { password, ...userWithoutPassword } = user as any;
            return NextResponse.json(userWithoutPassword);
        }
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }
        console.error("Login API Error:", error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

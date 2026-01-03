
import { fetchAllUsers, addUser } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const users = await fetchAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
        }
        const newUser = await addUser(username, password);
        return NextResponse.json(newUser, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

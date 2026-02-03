
import { fetchAllEmployees, addEmployee } from '@/lib/inventory-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const employees = await fetchAllEmployees();
        return NextResponse.json(employees);
    } catch (error) {
        console.error("API Error fetching employees:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const newEmployee = await addEmployee(body);
        return NextResponse.json(newEmployee, { status: 201 });
    } catch (error: any) {
        if (error.message.includes('Username already exists')) {
            return NextResponse.json({ message: error.message }, { status: 409 });
        }
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

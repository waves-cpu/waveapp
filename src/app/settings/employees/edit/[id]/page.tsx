'use client';

import { AppLayout } from '@/app/components/app-layout';
import { EmployeeForm } from '@/app/components/employee-form';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import { useEffect, useState } from 'react';
import type { Employee } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

function EditEmployeePageSkeleton() {
    return (
        <Card>
             <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Skeleton className="h-9 w-24" />
            </CardFooter>
        </Card>
    );
}

export default function EditEmployeePage() {
    const params = useParams();
    const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;
    const { employees, loading } = useInventory();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if(!loading && !isNaN(id)) {
            const found = employees.find(e => e.id === id);
            setEmployee(found || null);
            setPageLoading(false);
        }
    }, [id, employees, loading]);

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                </div>
                <div className="max-w-3xl mx-auto">
                    {pageLoading ? <EditEmployeePageSkeleton /> : employee ? <EmployeeForm existingEmployee={employee} /> : <p>Karyawan tidak ditemukan.</p>}
                </div>
            </main>
        </AppLayout>
    );
}

'use client';

import { AppLayout } from '@/app/components/app-layout';
import { EmployeeForm } from '@/app/components/employee-form';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function NewEmployeePage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                </div>
                <div className="max-w-3xl mx-auto">
                    <EmployeeForm />
                </div>
            </main>
        </AppLayout>
    );
}

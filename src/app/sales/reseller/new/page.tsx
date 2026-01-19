'use client';

import { AppLayout } from "@/app/components/app-layout";
import { ResellerForm } from "@/app/components/reseller-form";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function NewResellerPage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Tambah Reseller Baru</h1>
                </div>
                <div className="max-w-4xl mx-auto">
                    <ResellerForm />
                </div>
            </main>
        </AppLayout>
    );
}

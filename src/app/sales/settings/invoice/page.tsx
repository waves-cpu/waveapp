
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { InvoiceSettingsForm } from "@/app/components/invoice-settings-form";
import { SidebarTrigger } from "@/components/ui/sidebar";


export default function InvoiceSettingsPage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Pengaturan Faktur</h1>
                </div>

                <div className="max-w-4xl mx-auto">
                    <InvoiceSettingsForm />
                </div>
            </main>
        </AppLayout>
    )
}

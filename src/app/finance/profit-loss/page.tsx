
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ProfitLossPage() {
    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Laporan Laba Rugi</h1>
                </div>
                <div className="flex items-center justify-center h-64 border rounded-md bg-card">
                    <p className="text-muted-foreground">Halaman Laporan Laba Rugi - Konten akan segera hadir.</p>
                </div>
            </main>
        </AppLayout>
    );
}

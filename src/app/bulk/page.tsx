import { SidebarTrigger } from "@/components/ui/sidebar";

export default function BulkPage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-24">
            <div className="flex items-center gap-4 self-start">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-4xl font-bold">Bulk Operations</h1>
            </div>
            <div className="flex flex-col flex-1 items-center justify-center">
                 <p className="text-lg text-muted-foreground">This page is under construction.</p>
            </div>
        </main>
    );
}

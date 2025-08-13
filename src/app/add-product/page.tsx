import { AddProductForm } from "@/app/components/add-product-form";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function AddProductPage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-10">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-2xl font-bold">Add New Product</h1>
                </div>
                <AddProductForm />
            </div>
        </main>
    );
}

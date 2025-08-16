
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useReceiptSettings, type ReceiptSettings } from "@/hooks/use-receipt-settings";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { PosReceipt, type ReceiptData } from "./pos-receipt";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";


const formSchema = z.object({
    shopName: z.string().min(2, "Nama toko minimal 2 karakter."),
    addressLine1: z.string().optional(),
    phone: z.string().optional(),
    cashierName: z.string().min(2, "Nama kasir minimal 2 karakter."),
    paperSize: z.enum(['80mm', '58mm']),
});

export function ReceiptSettingsForm() {
    const { settings, setSettings, isLoaded } = useReceiptSettings();
    const router = useRouter();
    const [isJustSaved, setIsJustSaved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: settings,
    });
    
    useEffect(() => {
        if(isLoaded) {
            form.reset(settings);
        }
    }, [isLoaded, settings, form]);

    const watchedValues = form.watch();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        await setSettings(values);
        setIsSubmitting(false);
        setIsJustSaved(true);
    };

    useEffect(() => {
        if (isJustSaved) {
            const timer = setTimeout(() => setIsJustSaved(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isJustSaved]);
    
    const mockReceiptData: ReceiptData = useMemo(() => ({
        items: [
            { id: '1', productId: 'prod1', productName: 'T-Shirt Keren', name: 'L', price: 125000, quantity: 1, stock: 10, sku: 'TS-L' },
            { id: '2', productId: 'prod2', productName: 'Topi Gaul', name: 'All Size', price: 75000, quantity: 2, stock: 10, sku: 'CAP-ALL' },
        ],
        subtotal: 275000,
        discount: 10000,
        total: 265000,
        paymentMethod: 'Cash',
        cashReceived: 300000,
        change: 35000,
        transactionId: 'PREVIEW-123'
    }), []);

    if (!isLoaded) {
        return <div>Loading settings...</div>; // Or a skeleton loader
    }


    return (
        <div className="grid md:grid-cols-2 gap-8 items-start">
             <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-base">Informasi Toko</CardTitle>
                            <CardDescription>
                                Informasi ini akan ditampilkan di bagian atas struk.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="shopName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Toko</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nama Toko Anda" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="addressLine1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alamat</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Alamat toko" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nomor Telepon</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nomor telepon toko" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardHeader>
                            <CardTitle className="text-base">Pengaturan Struk</CardTitle>
                            <CardDescription>
                                Atur detail lain yang akan muncul di struk.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="cashierName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Kasir Default</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nama kasir" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="paperSize"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ukuran Kertas Struk</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih ukuran kertas" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            <SelectItem value="80mm">80mm (Standar)</SelectItem>
                                            <SelectItem value="58mm">58mm (Kecil)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Pilih ukuran kertas yang sesuai dengan printer thermal Anda.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>Kembali</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <div className="sticky top-10">
                <h3 className="text-sm font-medium mb-2">Pratinjau Struk</h3>
                <div className={cn(
                    "bg-gray-200 p-4 border rounded-md shadow-sm transition-all duration-300 flex justify-center",
                    isJustSaved && "shadow-lg shadow-primary/40 ring-2 ring-primary ring-offset-2"
                    )}>
                    <div className={cn("bg-white p-2", watchedValues.paperSize === '58mm' ? 'w-[58mm]' : 'w-[80mm]')}>
                        <PosReceipt 
                            receipt={mockReceiptData} 
                            previewSettings={watchedValues} 
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

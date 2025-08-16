
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


const formSchema = z.object({
    shopName: z.string().min(2, "Nama toko minimal 2 karakter."),
    addressLine1: z.string().optional(),
    phone: z.string().optional(),
    cashierName: z.string().min(2, "Nama kasir minimal 2 karakter."),
    paperSize: z.enum(['80mm', '58mm']),
});

export function ReceiptSettingsForm() {
    const { settings, setSettings } = useReceiptSettings();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: settings,
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        setSettings(values);
        toast({
            title: "Pengaturan Disimpan",
            description: "Pengaturan struk Anda telah berhasil diperbarui.",
        });
    };
    
    return (
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Button type="button" variant="ghost" onClick={() => router.back()}>Kembali</Button>
                        <Button type="submit">Simpan Pengaturan</Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}


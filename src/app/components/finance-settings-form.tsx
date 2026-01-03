
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFinanceSettings } from "@/hooks/use-finance-settings";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Percent } from "lucide-react";

const formSchema = z.object({
    marketplaceFee: z.coerce.number().min(0, "Biaya harus non-negatif.").max(100, "Biaya tidak bisa lebih dari 100%."),
});

export function FinanceSettingsForm() {
    const { settings, setSettings, isLoaded } = useFinanceSettings();
    const router = useRouter();
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

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await setSettings(values);
            form.reset(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isLoaded) {
        return <div>Memuat...</div>;
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="text-base">Biaya Marketplace</CardTitle>
                        <CardDescription>
                            Atur persentase potongan biaya (fee) dari marketplace seperti Shopee, Tiktok, dll. Ini akan digunakan untuk menghitung laba bersih.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="marketplaceFee"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Persentase Biaya</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                placeholder="cth. 3.2" 
                                                className="pl-8"
                                                {...field} />
                                        </FormControl>
                                        <Percent className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <FormDescription>
                                        Masukkan nilai persentase. Contoh: untuk 3.2%, masukkan 3.2
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>Kembali</Button>
                        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

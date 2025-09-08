
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useInvoiceSettings, type InvoiceSettings } from "@/hooks/use-invoice-settings";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";

const formSchema = z.object({
    shopName: z.string().min(2, "Nama toko minimal 2 karakter."),
    address: z.string().optional(),
    phone: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolder: z.string().optional(),
    termsAndConditions: z.string().optional(),
});

export function InvoiceSettingsForm() {
    const { settings, setSettings, isLoaded } = useInvoiceSettings();
    const { language } = useLanguage();
    const t = translations[language];
    const TInvoice = t.invoice;

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

    const watchedValues = form.watch();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true);
        try {
            await setSettings(values);
             form.reset(values); // Re-sync form state after saving
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isLoaded) {
        return <div>{t.common.loading}...</div>;
    }


    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="text-base">{TInvoice.shopInfoTitle}</CardTitle>
                        <CardDescription>{TInvoice.shopInfoDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="shopName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.shopNameLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.shopNamePlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.addressLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.addressPlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.phoneLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.phonePlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>

                    <CardHeader>
                        <CardTitle className="text-base">{TInvoice.paymentInfoTitle}</CardTitle>
                        <CardDescription>{TInvoice.paymentInfoDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.bankNameLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.bankNamePlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.accountNumberLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.accountNumberPlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="accountHolder"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>{TInvoice.accountHolderLabel}</FormLabel>
                                    <FormControl><Input placeholder={TInvoice.accountHolderPlaceholder} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    
                    <CardHeader>
                        <CardTitle className="text-base">{TInvoice.termsTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="termsAndConditions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{TInvoice.termsLabel}</FormLabel>
                                    <FormControl><Textarea placeholder={TInvoice.termsPlaceholder} {...field} rows={4} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>

                    <CardFooter className="justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>{t.common.back}</Button>
                        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                            {isSubmitting ? t.common.saving : t.common.saveChanges}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

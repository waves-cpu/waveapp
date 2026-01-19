'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import type { Reseller } from '@/types';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: 'Nama reseller minimal 2 karakter.' }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

interface ResellerFormProps {
    existingReseller?: Reseller;
}

export function ResellerForm({ existingReseller }: ResellerFormProps) {
    const { addReseller, updateReseller } = useInventory();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditMode = !!existingReseller;

    const defaultValues = useMemo(() => {
        if (!existingReseller) {
            return {
                name: '',
                phone: '',
                address: '',
            };
        }
        return {
            id: existingReseller.id,
            name: existingReseller.name,
            phone: existingReseller.phone || '',
            address: existingReseller.address || '',
        };
    }, [existingReseller]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await updateReseller(values.id!, values);
                toast({
                    title: 'Data Reseller Diperbarui',
                    description: `Data untuk ${values.name} telah berhasil disimpan.`,
                });
            } else {
                await addReseller(values);
                toast({
                    title: 'Reseller Ditambahkan',
                    description: `Reseller baru ${values.name} telah berhasil ditambahkan.`,
                });
            }
            router.push('/sales/reseller');
        } catch (error) {
            console.error("Failed to save reseller:", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan data reseller. Silakan coba lagi.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>{isEditMode ? 'Ubah Data Reseller' : 'Tambah Reseller Baru'}</CardTitle>
                        <CardDescription>
                            {isEditMode ? 'Ubah informasi untuk reseller yang sudah ada.' : 'Lengkapi formulir di bawah ini untuk menambahkan reseller baru.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nama Reseller</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Masukkan nama lengkap reseller" {...field} />
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
                                    <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 08123456789" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Alamat (Opsional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Masukkan alamat lengkap reseller" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                         <Button type="button" variant="ghost" onClick={() => router.push('/sales/reseller')} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

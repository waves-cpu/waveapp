
'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import type { PosCartItem } from './pos-order-summary';
import { Separator } from '@/components/ui/separator';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const paymentMethods = ["Cash", "QRIS", "Debit", "Transfer"] as const;
const banks = ["BCA", "BRI", "BNI", "Mandiri"] as const;

const formSchema = z.object({
  discount: z.coerce.number().min(0, "Diskon tidak boleh negatif").optional(),
  paymentMethod: z.enum(paymentMethods, { required_error: "Pilih metode pembayaran" }),
  bank: z.enum(banks).optional(),
  cashReceived: z.coerce.number().optional(),
}).refine(data => {
    if (data.paymentMethod === 'Debit' || data.paymentMethod === 'Transfer') {
        return !!data.bank;
    }
    return true;
}, {
    message: "Pilih bank",
    path: ['bank'],
});


interface PosCheckoutFormProps {
  cart: PosCartItem[];
}

export function PosCheckoutForm({ cart }: PosCheckoutFormProps) {
    const { recordSale } = useInventory();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          discount: 0,
        },
    });

    const watchPaymentMethod = form.watch('paymentMethod');
    const watchDiscount = form.watch('discount');
    const watchCashReceived = form.watch('cashReceived');
    
    const totalAfterDiscount = useMemo(() => {
      return subtotal - (watchDiscount || 0);
    }, [subtotal, watchDiscount]);

    const change = useMemo(() => {
        if (watchPaymentMethod === 'Cash' && watchCashReceived !== undefined && watchCashReceived >= totalAfterDiscount) {
            return watchCashReceived - totalAfterDiscount;
        }
        return 0;
    }, [watchCashReceived, totalAfterDiscount, watchPaymentMethod]);

    const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
        if (values.paymentMethod === 'Cash' && (values.cashReceived ?? 0) < totalAfterDiscount) {
            form.setError('cashReceived', { type: 'manual', message: 'Uang tunai kurang dari total bayar.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const saleDate = new Date();
            const transactionId = `POS-${saleDate.getTime()}`; 
            
            for (const item of cart) {
                await recordSale(item.sku, 'pos', item.quantity, saleDate, transactionId);
            }

            toast({
                title: 'Transaksi Berhasil',
                description: `${cart.length} jenis item berhasil terjual. No. Transaksi: ${transactionId}`,
            });
            
            localStorage.removeItem('posCart');
            
            // Here you would typically trigger a print job with the cart and paymentDetails
            toast({
                title: 'Struk Siap Dicetak',
                description: `Fungsi cetak struk akan diimplementasikan di sini.`,
            });
            
            router.push('/sales/pos');

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
            toast({
                variant: 'destructive',
                title: 'Transaksi Gagal',
                description: message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

  return (
    <Card>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                <CardHeader>
                    <CardTitle>Ringkasan & Pembayaran</CardTitle>
                    <CardDescription>
                        Anda memiliki {totalItems} item di keranjang Anda.
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                    <ScrollArea className="h-64 pr-4 border rounded-md p-4">
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.sku} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4">
                                    <Image 
                                        src={item.imageUrl || 'https://placehold.co/64x64.png'} 
                                        alt={item.name} 
                                        width={64} height={64} 
                                        className="rounded-md object-cover" 
                                        data-ai-hint="product image"
                                    />
                                    <div className="flex-grow">
                                        <p className="font-medium" title={item.name}>{item.name}</p>
                                        {item.variantName && <p className="text-sm text-muted-foreground">{item.variantName}</p>}
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-semibold text-sm whitespace-nowrap text-right">{`Rp${(item.price * item.quantity).toLocaleString('id-ID')}`}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                
                    <div className="w-full space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-medium">Rp{subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Diskon</span>
                            <FormField
                                control={form.control}
                                name="discount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl><Input type="number" placeholder="0" {...field} className="w-28 h-8 text-right" /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center font-bold text-base">
                            <span>Total</span>
                            <span>Rp{totalAfterDiscount.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Metode Pembayaran</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 gap-4"
                                    >
                                    {paymentMethods.map(method => (
                                        <FormItem key={method} className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={method} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{method}</FormLabel>
                                        </FormItem>
                                    ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        { (watchPaymentMethod === 'Debit' || watchPaymentMethod === 'Transfer') && (
                            <FormField
                                control={form.control}
                                name="bank"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Pilih Bank</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih bank tujuan" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {banks.map(bank => (
                                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        { watchPaymentMethod === 'Cash' && (
                            <div className='space-y-4'>
                            <FormField
                                control={form.control}
                                name="cashReceived"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Uang Tunai Diterima</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Masukkan jumlah uang" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                                {change > 0 && (
                                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md">
                                    <span className="text-muted-foreground">Kembalian</span>
                                    <span className="font-medium">Rp{change.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex-col gap-2 pt-6 border-t">
                    <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0 || !form.formState.isValid}>
                        {isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                    </Button>
                </CardFooter>
            </form>
        </Form>
    </Card>
  );
}

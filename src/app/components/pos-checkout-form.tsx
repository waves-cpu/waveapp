
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import type { PosCartItem } from './pos-order-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer } from 'lucide-react';


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
}).refine(data => {
    if (data.paymentMethod === 'Cash') {
        return data.cashReceived !== undefined && data.cashReceived >= 0;
    }
    return true;
}, {
    message: "Masukkan jumlah uang tunai",
    path: ['cashReceived'],
});


export function PosCheckoutForm() {
  const { recordSale } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<PosCartItem[] | null>(null);

  useEffect(() => {
    try {
        const savedCart = localStorage.getItem('posCart');
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if(Array.isArray(parsedCart) && parsedCart.length > 0) {
                 setCart(parsedCart);
            } else {
                // If cart is empty, redirect back to POS
                router.replace('/sales/pos');
            }
        } else {
            router.replace('/sales/pos');
        }
    } catch (error) {
        console.error("Could not load cart from local storage", error);
        router.replace('/sales/pos');
    }
  }, [router]);

  const { subtotal, totalItems } = useMemo(() => {
    if (!cart) return { subtotal: 0, totalItems: 0 };
    const sub = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const items = cart.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal: sub, totalItems: items };
  }, [cart]);
  
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
    if (watchPaymentMethod === 'Cash' && watchCashReceived !== undefined) {
        return watchCashReceived - totalAfterDiscount;
    }
    return 0;
  }, [watchCashReceived, totalAfterDiscount, watchPaymentMethod]);

  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!cart) return;

    if (values.paymentMethod === 'Cash' && (values.cashReceived ?? 0) < totalAfterDiscount) {
        form.setError('cashReceived', { type: 'manual', message: 'Uang tunai kurang dari total bayar.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const saleDate = new Date();
        const transactionId = `POS-${saleDate.getTime()}`; // Generate a unique transaction ID
        
        for (const item of cart) {
            await recordSale(item.sku, 'pos', item.quantity, saleDate, transactionId);
        }

        toast({
            title: 'Transaksi Berhasil',
            description: `${cart.length} jenis item berhasil terjual. No. Transaksi: ${transactionId}`,
        });
        localStorage.removeItem('posCart');
        
        // Here you would typically trigger a print function. For now, we'll just show a success message.
        toast({
            title: 'Struk Siap Dicetak',
            description: 'Fungsi cetak struk akan diimplementasikan di sini.',
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
  }

  if (!cart) {
    return (
        <Card>
            <CardContent className="p-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Skeleton className="h-20 w-full mb-6" />
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="max-h-60 mb-4">
                        <div className="space-y-4 pr-6">
                        {cart.map(item => (
                            <div key={item.sku} className="flex justify-between items-start text-sm">
                                <div className="flex-grow">
                                    <p className="font-medium truncate">{item.name} {item.variantName && `(${item.variantName})`}</p>
                                    <p className="text-muted-foreground">{item.quantity} x Rp{item.price.toLocaleString('id-ID')}</p>
                                </div>
                                <p className="font-medium">Rp{(item.quantity * item.price).toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                    <Separator />
                    <div className="space-y-2 text-sm mt-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal ({totalItems} item)</span>
                            <span>Rp{subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Diskon</span>
                            <span className="text-red-500">- Rp{(watchDiscount || 0).toLocaleString('id-ID')}</span>
                        </div>
                         <Separator />
                         <div className="flex justify-between font-bold text-base">
                            <span>Total</span>
                            <span>Rp{totalAfterDiscount.toLocaleString('id-ID')}</span>
                        </div>
                         {watchPaymentMethod === 'Cash' && change >= 0 && (
                             <div className="flex justify-between text-muted-foreground">
                                <span>Kembalian</span>
                                <span>Rp{change.toLocaleString('id-ID')}</span>
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Detail Pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Diskon (Rp)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
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
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-2 !p-4 border-t">
                     <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                        {isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak Struk
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </Form>
  );
}


'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, Minus, Plus, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

export interface PosCartItem {
  id: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl?: string;
}

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


interface PosOrderSummaryProps {
  cart: PosCartItem[];
  setCart: React.Dispatch<React.SetStateAction<PosCartItem[]>>;
  onCheckout: (paymentDetails: z.infer<typeof formSchema>) => Promise<void>;
  isSubmitting: boolean;
}

export function PosOrderSummary({ cart, setCart, onCheckout, isSubmitting }: PosOrderSummaryProps) {
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


    const updateQuantity = (sku: string, newQuantity: number) => {
        setCart(prevCart =>
        prevCart.map(item => {
            if (item.sku === sku) {
            const clampedQuantity = Math.max(0, Math.min(newQuantity, item.maxStock));
            return { ...item, quantity: clampedQuantity };
            }
            return item;
        }).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
        );
    };

    const removeItem = (sku: string) => {
        setCart(prevCart => prevCart.filter(item => item.sku !== sku));
    };

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        if (values.paymentMethod === 'Cash' && (values.cashReceived ?? 0) < totalAfterDiscount) {
            form.setError('cashReceived', { type: 'manual', message: 'Uang tunai kurang dari total bayar.' });
            return;
        }
        onCheckout(values).then(() => {
            form.reset({ discount: 0, paymentMethod: undefined, bank: undefined, cashReceived: undefined });
        });
    };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <CardTitle>Pesanan Saat Ini</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 space-y-4">
            {cart.length > 0 ? (
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.sku} className="flex items-center gap-4">
                            <Image 
                                src={item.imageUrl || 'https://placehold.co/64x64.png'} 
                                alt={item.name} 
                                width={64} height={64} 
                                className="rounded-md object-cover" 
                                data-ai-hint="product image"
                            />
                            <div className="flex-grow">
                                <p className="font-medium leading-tight text-sm" title={item.name}>{item.name}</p>
                                {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                                <p className="font-semibold text-sm mt-1">{`Rp${item.price.toLocaleString('id-ID')}`}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.sku, item.quantity - 1)}>
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.sku, item.quantity + 1)} disabled={item.quantity >= item.maxStock}>
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive-foreground hover:bg-destructive shrink-0" onClick={() => removeItem(item.sku)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground pt-16 text-center">
                    <ShoppingCart className="h-16 w-16 mb-4" />
                    <p className="font-semibold">Keranjang Kosong</p>
                    <p className="text-sm">Scan atau pilih produk untuk ditambahkan.</p>
                </div>
            )}
      </CardContent>
        
        {cart.length > 0 && (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                    <CardContent className="p-4 space-y-4 border-t">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">Rp{subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Diskon</span>
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
                        </div>
                            <Separator />
                        <div className="flex justify-between items-center font-bold text-base">
                            <span>Total</span>
                            <span>Rp{totalAfterDiscount.toLocaleString('id-ID')}</span>
                        </div>
                            <Separator />

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
                            <div className='space-y-2'>
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
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Kembalian</span>
                                    <span className="font-medium">Rp{change.toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 p-4 border-t">
                        <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0 || !form.formState.isValid}>
                            {isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={() => window.print()} disabled={isSubmitting}>
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak Struk Terakhir
                        </Button>
                    </CardFooter>
                </form>
                </Form>
        )}
    </Card>
  );
}

    
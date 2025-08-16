
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

export interface PosCartItem {
  id: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  maxStock: number;
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
            const clampedQuantity = Math.max(1, Math.min(newQuantity, item.maxStock));
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
            form.reset({ discount: 0 });
        });
    };

  return (
    <Card className="sticky top-0 flex flex-col h-full">
      <CardHeader className="py-4 px-4">
        <CardTitle className="text-lg">Pesanan & Pembayaran</CardTitle>
      </CardHeader>
        <ScrollArea className="flex-grow">
            <CardContent className="space-y-6 px-4">
                {/* Cart Items */}
                <div>
                    {cart.length > 0 ? (
                    <div className="space-y-3">
                        {cart.map(item => (
                            <div key={item.sku} className="flex items-start gap-3">
                            <div className="flex-grow">
                                <p className="font-medium leading-tight text-sm truncate" title={item.name}>{item.name}</p>
                                {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                <p className="font-semibold text-sm">{`Rp${item.price.toLocaleString('id-ID')}`}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.sku, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                type="number"
                                value={item.quantity}
                                onChange={e => updateQuantity(item.sku, parseInt(e.target.value, 10) || 1)}
                                className="h-6 w-10 text-center px-1"
                                onFocus={(e) => e.target.select()}
                                />
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.sku, item.quantity + 1)} disabled={item.quantity >= item.maxStock}>
                                <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0" onClick={() => removeItem(item.sku)}>
                                <X className="h-4 w-4" />
                            </Button>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                        <ShoppingCart className="h-16 w-16 mb-4" />
                        <p className="font-semibold">Keranjang Kosong</p>
                        <p className="text-sm">Scan atau pilih produk untuk ditambahkan.</p>
                    </div>
                    )}
                </div>

                {/* Checkout Details */}
                {cart.length > 0 && (
                    <Form {...form}>
                         <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-[1fr_auto] gap-x-4">
                                    <span className="text-muted-foreground">Subtotal ({totalItems} item)</span>
                                    <span className="text-right font-medium">Rp{subtotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="grid grid-cols-[1fr_auto] gap-x-4 items-center">
                                    <span className="text-muted-foreground">Diskon</span>
                                     <FormField
                                        control={form.control}
                                        name="discount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="0" {...field} className="w-28 h-7 text-right" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                    <Separator />
                                    <div className="grid grid-cols-[1fr_auto] gap-x-4 font-bold text-base">
                                    <span>Total</span>
                                    <span className="text-right">Rp{totalAfterDiscount.toLocaleString('id-ID')}</span>
                                </div>
                                    {watchPaymentMethod === 'Cash' && change > 0 && (
                                        <div className="grid grid-cols-[1fr_auto] gap-x-4 text-muted-foreground">
                                        <span>Kembalian</span>
                                        <span className="text-right font-medium">Rp{change.toLocaleString('id-ID')}</span>
                                    </div>
                                    )}
                            </div>
                             <Separator />

                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
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
                             <CardFooter className="flex-col !p-0 !pt-2">
                                <div className="w-full flex-col gap-2 space-y-2">
                                     <Button type="submit" className="w-full" disabled={isSubmitting || cart.length === 0 || !form.formState.isValid}>
                                        {isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                                    </Button>
                                    <Button type="button" variant="outline" className="w-full" onClick={() => window.print()} disabled={isSubmitting}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Cetak Struk
                                    </Button>
                                </div>
                            </CardFooter>
                         </form>
                    </Form>
                )}
            </CardContent>
        </ScrollArea>
    </Card>
  );
}

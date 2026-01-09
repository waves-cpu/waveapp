
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem } from './reseller-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Printer, User, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { type InvoiceData } from './reseller-invoice';
import type { Reseller, ResellerTier } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface ResellerOrderSummaryProps {
  cart: CartItem[];
  onSaleComplete: (paymentMethod: string, invoiceData: InvoiceData) => Promise<void>;
  clearCart: () => void;
  reseller: Reseller | null;
  resellerTier: ResellerTier;
}

type PaymentMethod = 'Cash' | 'Transfer';

export function ResellerOrderSummary({ cart, onSaleComplete, clearCart, reseller, resellerTier }: ResellerOrderSummaryProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer');

    const { subtotal, totalDiscount, finalTotal } = useMemo(() => {
        const subtotalCalc = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        let discount = 0;
        if (resellerTier.discountPercentage > 0) {
            discount = subtotalCalc * (resellerTier.discountPercentage / 100);
        }
        
        const finalTotalCalc = subtotalCalc - discount;

        return { 
            subtotal: subtotalCalc, 
            totalDiscount: discount,
            finalTotal: finalTotalCalc,
        };
    }, [cart, resellerTier]);

    useEffect(() => {
        if (cart.length === 0) {
            setPaymentMethod('Transfer');
        }
    }, [cart]);
    
    const resetForm = () => {
        setPaymentMethod('Transfer');
        clearCart();
    }

    const handleSale = async () => {
        if (!reseller) return;

        setIsSubmitting(true);
        
        const invoiceData: InvoiceData = {
            resellerName: reseller.name,
            resellerAddress: reseller.address,
            resellerPhone: reseller.phone,
            items: cart.map(item => ({
                productName: item.productName,
                variantName: item.variantName || '',
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
            })),
            subtotal: subtotal,
            discount: totalDiscount,
            total: finalTotal,
            paymentMethod: paymentMethod,
            transactionId: `trans-${Date.now()}`
        };
        
        try {
            await onSaleComplete(paymentMethod, invoiceData);
            resetForm();
        } catch (error) {
            console.error("Sale failed, not resetting form.", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="flex flex-col h-full sticky top-4 no-print">
            <CardHeader>
                 {!reseller ? (
                    <div className="text-center text-muted-foreground py-10">
                        <User className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">Pilih Reseller</h3>
                        <p className="mt-1 text-sm">Pilih reseller untuk memulai transaksi.</p>
                    </div>
                ) : (
                    <div>
                        <CardTitle className="text-base flex justify-between items-center">
                            <span>Detail Pesanan</span>
                            <Badge>{resellerTier.name}</Badge>
                        </CardTitle>
                        <p className="text-sm font-medium">{reseller.name}</p>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {reseller && (
                    <>
                    <div className="space-y-3">
                        <Label>Metode Pembayaran</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="grid grid-cols-2 gap-2">
                            <div>
                                <RadioGroupItem value="Transfer" id="transfer" className="peer sr-only" />
                                <Label htmlFor="transfer" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    Transfer
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="Cash" id="cash" className="peer sr-only" />
                                <Label htmlFor="cash" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    Tunai
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    </>
                )}
            </CardContent>
            {reseller && (
                <CardFooter className="flex-col !p-4 mt-auto">
                    <div className="w-full space-y-2 p-4 bg-muted rounded-md">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Diskon ({resellerTier.discountPercentage}%)</span>
                            <span className="text-destructive">
                                -{totalDiscount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                            </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-base font-bold">
                            <span>Total</span>
                            <span className="text-primary">{finalTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-2 mt-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="lg" disabled={cart.length === 0 || isSubmitting}>
                                    <X className="mr-2 h-4 w-4"/>
                                    Batalkan
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Batalkan Transaksi?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan mengosongkan keranjang. Anda tidak dapat mengurungkan tindakan ini.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Lanjutkan Transaksi</AlertDialogCancel>
                                    <AlertDialogAction onClick={resetForm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Ya, Batalkan
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button size="lg" onClick={handleSale} disabled={cart.length === 0 || isSubmitting}>
                            <Printer className="mr-2 h-4 w-4" />
                            {isSubmitting ? 'Memproses...' : 'Cetak Invoice'}
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

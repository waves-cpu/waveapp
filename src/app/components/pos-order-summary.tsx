
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem } from './pos-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Printer } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
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
import { type ReceiptData } from './pos-receipt';

interface PosOrderSummaryProps {
  cart: CartItem[];
  onSaleComplete: (paymentMethod: string, receiptData: ReceiptData) => Promise<void>;
  clearCart: () => void;
  channel: 'pos' | 'reseller';
}

type PaymentMethod = 'Cash' | 'Qris' | 'Transfer' | 'Debit';

export function PosOrderSummary({ cart, onSaleComplete, clearCart, channel }: PosOrderSummaryProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const [discount, setDiscount] = useState(0);
    const [cashReceived, setCashReceived] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(channel === 'reseller' ? 'Transfer' : 'Cash');

    useEffect(() => {
        setPaymentMethod(channel === 'reseller' ? 'Transfer' : 'Cash');
    }, [channel]);

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const total = useMemo(() => subtotal - discount, [subtotal, discount]);
    const change = useMemo(() => cashReceived - total, [cashReceived, total]);

    const resetForm = () => {
        setDiscount(0);
        setCashReceived(0);
        setPaymentMethod(channel === 'reseller' ? 'Transfer' : 'Cash');
        clearCart();
    }

    const handleSale = async () => {
        setIsSubmitting(true);
        const saleData: ReceiptData = {
            items: cart,
            subtotal,
            discount,
            total,
            paymentMethod,
            cashReceived: paymentMethod === 'Cash' ? cashReceived : total,
            change: paymentMethod === 'Cash' ? change : 0,
            transactionId: `trans-${Date.now()}`
        };
        
        try {
            await onSaleComplete(paymentMethod, saleData);
            // The parent component (PosCart or ResellerCart) will handle the printing
            resetForm();
        } catch (error) {
            // Error toast is handled in the parent
            console.error("Sale failed, not resetting form.", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    

    return (
        <Card className="flex flex-col h-full sticky top-4 no-print">
            <CardHeader>
                <CardTitle className="text-base">{t.pos.paymentDetails}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>{t.pos.subtotal}</span>
                        <span>{subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Label htmlFor="discount">{t.pos.discount}</Label>
                        <Input id="discount" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-32 h-8 text-sm"/>
                    </div>
                </div>
                <Separator />
                <div className="space-y-3">
                    <Label>{t.pos.paymentMethod}</Label>
                     {channel === 'reseller' ? (
                        <Input value="Transfer" disabled className="h-10 text-base" />
                    ) : (
                        <RadioGroup value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="grid grid-cols-2 gap-2">
                            <div>
                                <RadioGroupItem value="Cash" id="cash" className="peer sr-only" />
                                <Label htmlFor="cash" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    {t.pos.cash}
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="Qris" id="qris" className="peer sr-only" />
                                <Label htmlFor="qris" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    QRIS
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="Debit" id="debit" className="peer sr-only" />
                                <Label htmlFor="debit" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    Debit
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="Transfer" id="transfer" className="peer sr-only" />
                                <Label htmlFor="transfer" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary text-sm cursor-pointer">
                                    Transfer
                                </Label>
                            </div>
                        </RadioGroup>
                    )}
                </div>
                {paymentMethod === 'Cash' && (
                    <div className="space-y-2">
                        <Label htmlFor="cashReceived">{t.pos.cashReceived}</Label>
                        <Input id="cashReceived" type="number" placeholder="0" value={cashReceived || ''} onChange={(e) => setCashReceived(Number(e.target.value))} className="h-10 text-base" />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col !p-4 mt-auto">
                <div className="w-full space-y-2 text-base font-bold mb-4 p-4 bg-muted rounded-md">
                    <div className="flex justify-between">
                        <span>{t.pos.total}</span>
                        <span className="text-primary">{total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                     {paymentMethod === 'Cash' && (
                        <div className="flex justify-between text-sm">
                            <span>{t.pos.change}</span>
                            <span>{change >= 0 ? change.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</span>
                        </div>
                     )}
                </div>
                <div className="w-full grid grid-cols-2 gap-2">
                    <AlertDialog>
                         <AlertDialogTrigger asChild>
                            <Button variant="outline" size="lg" disabled={cart.length === 0 || isSubmitting}>
                                <X className="mr-2 h-4 w-4"/>
                                {t.pos.cancel}
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
                                <AlertDialogCancel>Lanjut Transaksi</AlertDialogCancel>
                                <AlertDialogAction onClick={resetForm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Ya, Batalkan
                                </AlertDialogAction>
                            </AlertDialogFooter>
                         </AlertDialogContent>
                    </AlertDialog>

                    <Button size="lg" onClick={handleSale} disabled={cart.length === 0 || (paymentMethod === 'Cash' && change < 0) || isSubmitting}>
                        <Printer className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Memproses...' : t.pos.completeSale}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

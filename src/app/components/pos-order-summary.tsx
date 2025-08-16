
'use client';

import React, { useState, useMemo } from 'react';
import type { CartItem } from './pos-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import Image from 'next/image';
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

interface PosOrderSummaryProps {
  cart: CartItem[];
  updateQuantity: (itemId: string, newQuantity: number) => void;
  removeFromCart: (itemId:string) => void;
  onSaleComplete: () => Promise<void>;
  clearCart: () => void;
}

export function PosOrderSummary({ cart, updateQuantity, removeFromCart, onSaleComplete, clearCart }: PosOrderSummaryProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [cashReceived, setCashReceived] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saleCompleted, setSaleCompleted] = useState(false);

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
    const taxAmount = useMemo(() => subtotal * (tax / 100), [subtotal, tax]);
    const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount]);
    const change = useMemo(() => cashReceived - total, [cashReceived, total]);

    const handleSale = async () => {
        setIsSubmitting(true);
        await onSaleComplete();
        setIsSubmitting(false);
        setSaleCompleted(true);
    };

    const handleNewSale = () => {
        setSaleCompleted(false);
        setDiscount(0);
        setTax(0);
        setCashReceived(0);
        clearCart();
    };
    
    if (saleCompleted) {
        return (
            <Card className="flex-grow flex flex-col justify-center items-center text-center p-8">
                <CardTitle className="text-2xl font-bold mb-2">{t.pos.saleCompleted}</CardTitle>
                <p className="text-muted-foreground mb-4">Total: {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</p>
                <div className="space-y-4">
                    <Button onClick={handleNewSale} size="lg">{t.pos.newSale}</Button>
                    <Button variant="outline" size="lg" disabled>{t.pos.printReceipt}</Button>
                </div>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {/* Cart Section */}
            <Card className="md:col-span-2 flex flex-col">
                 <CardHeader>
                    <CardTitle>{t.pos.orderSummary}</CardTitle>
                 </CardHeader>
                 <CardContent className="flex-grow overflow-hidden p-0">
                    <ScrollArea className="h-full">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50%]">{t.pos.item}</TableHead>
                                    <TableHead>{t.pos.qty}</TableHead>
                                    <TableHead className="text-right">{t.pos.price}</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <ShoppingCart className="h-16 w-16" />
                                                <p className="font-semibold">{t.pos.emptyCart}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : cart.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Image src={item.parentImageUrl || 'https://placehold.co/40x40.png'} alt={item.productName} width={40} height={40} className="rounded-md" data-ai-hint="product image" />
                                                <div>
                                                    <p className="font-medium">{item.productName}</p>
                                                    <p className="text-xs text-muted-foreground">{item.name}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                                                <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-12 h-8 text-center" />
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.price.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="text-right font-medium">{(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                                        <TableCell>
                                             <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                             </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </ScrollArea>
                 </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>{t.pos.paymentDetails}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>{t.pos.subtotal}</span>
                            <span>{subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="discount">{t.pos.discount}</Label>
                            <Input id="discount" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-32 h-8"/>
                        </div>
                         <div className="flex justify-between items-center">
                            <Label htmlFor="tax">{t.pos.tax}</Label>
                            <Input id="tax" type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-32 h-8"/>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="cashReceived">{t.pos.cashReceived}</Label>
                        <Input id="cashReceived" type="number" placeholder="0" value={cashReceived || ''} onChange={(e) => setCashReceived(Number(e.target.value))} className="h-10 text-lg" />
                    </div>
                </CardContent>
                <CardFooter className="flex-col !p-4">
                    <div className="w-full space-y-2 text-lg font-bold mb-4 p-4 bg-muted rounded-md">
                        <div className="flex justify-between">
                            <span>{t.pos.total}</span>
                            <span className="text-primary">{total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span>
                        </div>
                         <div className="flex justify-between text-base">
                            <span>{t.pos.change}</span>
                            <span>{change >= 0 ? change.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'}</span>
                        </div>
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
                                    <AlertDialogAction onClick={handleNewSale} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Ya, Batalkan
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                             </AlertDialogContent>
                        </AlertDialog>

                        <Button size="lg" onClick={handleSale} disabled={cart.length === 0 || change < 0 || isSubmitting}>
                            {isSubmitting ? 'Memproses...' : t.pos.completeSale}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

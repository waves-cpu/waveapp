
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem } from './pos-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Printer, Save, Tag, CheckCircle } from 'lucide-react';
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
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';

interface PosOrderSummaryProps {
  cart: CartItem[];
  onSaleComplete: (paymentMethod: string, receiptData: ReceiptData, status?: 'Completed' | 'Pending') => Promise<void>;
  clearCart: () => void;
  channel: 'pos' | 'reseller';
  pendingTransactionId: string | null;
  onVoucherApplied: (voucherData: any) => void;
  activeVoucher: any;
}

type PaymentMethod = 'Cash' | 'Qris' | 'Transfer' | 'Debit';

export function PosOrderSummary({ cart, onSaleComplete, clearCart, channel, pendingTransactionId, onVoucherApplied, activeVoucher }: PosOrderSummaryProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const { cancelSaleTransaction } = useInventory();
    const { toast } = useToast();
    const router = useRouter();
    const [manualDiscount, setManualDiscount] = useState(0);
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; name: string } | null>(null);
    const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
    const [cashReceived, setCashReceived] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(channel === 'reseller' ? 'Transfer' : 'Cash');
    
    const isAccessoryOnlyTx = useMemo(() => cart.length > 0 && cart.every(item => item.type === 'accessory'), [cart]);

    useEffect(() => {
        setPaymentMethod(channel === 'reseller' ? 'Transfer' : 'Cash');
    }, [channel]);

    const { subtotal, totalDiscount } = useMemo(() => {
        let sub = 0;
        let discount = 0;
        cart.forEach(item => {
            sub += item.originalPrice * item.quantity;
            discount += (item.originalPrice - item.price) * item.quantity;
        });
        return { subtotal: sub, totalDiscount: discount };
    }, [cart]);
    
    const finalDiscount = activeVoucher ? totalDiscount : manualDiscount;
    const total = useMemo(() => subtotal - finalDiscount, [subtotal, finalDiscount]);
    const change = useMemo(() => cashReceived - total, [cashReceived, total]);


    useEffect(() => {
        if (cart.length === 0) {
            setManualDiscount(0);
            setCashReceived(0);
            setVoucherCode('');
            setAppliedVoucher(null);
            onVoucherApplied(null);
        }
    }, [cart, onVoucherApplied]);
    
    const resetForm = () => {
        setManualDiscount(0);
        setCashReceived(0);
        setPaymentMethod(channel === 'reseller' ? 'Transfer' : 'Cash');
        setVoucherCode('');
        setAppliedVoucher(null);
        onVoucherApplied(null);
        clearCart();
    }


    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) return;
        setIsApplyingVoucher(true);
        try {
            const data = await apiFetch(`/api/finance/discounts/voucher/${voucherCode.trim()}?channel=${channel}`);
            onVoucherApplied(data);
            setAppliedVoucher({ code: voucherCode.trim().toUpperCase(), name: data.name });
            setManualDiscount(0); // Reset manual discount
            toast({
                title: "Voucher Diterapkan",
                description: `Diskon dari "${data.name}" telah diterapkan pada item yang sesuai.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Voucher Tidak Valid",
                description: error.message,
            });
            onVoucherApplied(null);
            setAppliedVoucher(null);
        } finally {
            setIsApplyingVoucher(false);
            setVoucherCode('');
        }
    };
    
    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        onVoucherApplied(null);
        toast({ title: 'Voucher Dihapus', description: 'Harga telah kembali normal.' });
    };


    const handleSale = async (status: 'Completed' | 'Pending') => {
        setIsSubmitting(true);
        const receiptData: ReceiptData = {
            items: cart.map(item => ({...item, name: item.productName, originalPrice: item.originalPrice })),
            subtotal,
            discount: finalDiscount,
            total,
            paymentMethod,
            cashReceived: paymentMethod === 'Cash' ? cashReceived : total,
            change: paymentMethod === 'Cash' ? change : 0,
            transactionId: `trans-${Date.now()}` // This is a placeholder, real ID is set in parent
        };
        
        try {
            await onSaleComplete(paymentMethod, receiptData, status);
            resetForm();
            if(status === 'Pending') {
                router.push('/sales/pos/pending');
            }
        } catch (error) {
            console.error("Sale failed, not resetting form.", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancel = async () => {
        if (pendingTransactionId) {
            try {
                await cancelSaleTransaction(pendingTransactionId);
                toast({
                    title: "Transaksi Tertunda Dibatalkan",
                    description: "Transaksi yang ditahan telah dihapus dan stok telah dikembalikan."
                });
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: "Gagal Membatalkan",
                    description: "Gagal membatalkan transaksi yang ditahan."
                });
            }
        }
        resetForm();
    }


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
                    {!isAccessoryOnlyTx && (
                        <>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="discount">{t.pos.discount}</Label>
                            <Input id="discount" type="number" value={finalDiscount} onChange={(e) => setManualDiscount(Number(e.target.value))} className="w-32 h-8 text-sm" disabled={!!activeVoucher}/>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="voucher">Kode Voucher</Label>
                             {appliedVoucher ? (
                                 <div className="flex items-center justify-between">
                                    <Badge>
                                         <CheckCircle className="mr-2 h-4 w-4" />
                                         {appliedVoucher.code}
                                    </Badge>
                                    <Button variant="link" size="sm" className="h-auto p-0" onClick={handleRemoveVoucher}>Hapus</Button>
                                 </div>
                             ) : (
                                <div className="flex items-center gap-2">
                                    <Input id="voucher" type="text" placeholder="Masukkan kode voucher" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} disabled={isApplyingVoucher}/>
                                    <Button onClick={handleApplyVoucher} disabled={!voucherCode || isApplyingVoucher} size="sm">Terapkan</Button>
                                </div>
                             )}
                         </div>
                        </>
                    )}
                </div>
                <Separator />
                {!isAccessoryOnlyTx && (
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
                )}
                {paymentMethod === 'Cash' && channel !== 'reseller' && !isAccessoryOnlyTx && (
                    <div className="space-y-2">
                        <Label htmlFor="cashReceived">{t.pos.cashReceived}</Label>
                        <Input id="cashReceived" type="number" placeholder="0" value={cashReceived || ''} onChange={(e) => setCashReceived(Number(e.target.value))} className="h-10 text-base" />
                    </div>
                )}
                 {isAccessoryOnlyTx && (
                    <div className="text-center text-sm text-muted-foreground p-4 border rounded-md">
                        Ini adalah transaksi pengambilan barang (aksesoris) dan tidak akan memengaruhi laporan penjualan.
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex-col !p-4 mt-auto">
                 {!isAccessoryOnlyTx && (
                    <div className="w-full space-y-2 text-base font-bold mb-4 p-4 bg-muted rounded-md">
                        <div className="flex justify-between">
                            <span>{t.pos.total}</span>
                            <span className="text-primary">{total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        {paymentMethod === 'Cash' && channel !== 'reseller' && (
                            <div className="flex justify-between text-sm">
                                <span>{t.pos.change}</span>
                                <span>{change >= 0 ? change.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</span>
                            </div>
                        )}
                    </div>
                 )}
                <div className="w-full grid grid-cols-1 gap-2">
                    <Button size="lg" onClick={() => handleSale('Completed')} disabled={cart.length === 0 || (paymentMethod === 'Cash' && change < 0 && !isAccessoryOnlyTx) || isSubmitting}>
                        <Printer className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Memproses...' : (isAccessoryOnlyTx ? 'Cetak Voucher' : 'Proses Pembayaran')}
                    </Button>
                    <div className="flex gap-2">
                        <AlertDialog>
                             <AlertDialogTrigger asChild>
                                <Button variant="outline" size="lg" className="w-1/2" disabled={cart.length === 0 || isSubmitting}>
                                    <X className="mr-2 h-4 w-4"/>
                                    {t.pos.cancel}
                                </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Batalkan Transaksi?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan mengosongkan keranjang. Jika ini adalah transaksi yang ditahan, transaksi tersebut akan dihapus dari riwayat.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Lanjut Transaksi</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Ya, Batalkan
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                             </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="secondary" size="lg" className="w-1/2" onClick={() => handleSale('Pending')} disabled={cart.length === 0 || isSubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            Simpan Transaksi
                        </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

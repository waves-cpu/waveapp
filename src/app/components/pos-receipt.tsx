
'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { CartItem } from './pos-cart';
import { format } from 'date-fns';

export interface ReceiptData {
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    cashReceived: number;
    change: number;
    transactionId: string;
}

interface PosReceiptProps {
    receipt: ReceiptData;
    onReady: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
};

export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>((props, ref) => {
    const { receipt, onReady } = props;
    const { language } = useLanguage();
    const t = translations[language];
    const receiptTranslations = t.receipt;

    useEffect(() => {
        // Signal that the component is mounted and ready to be printed.
        onReady();
    }, [onReady]);


    return (
        <div ref={ref} className="bg-white text-black text-[10px] font-mono p-2 w-[80mm] mx-auto">
            <header className="text-center mb-2">
                <h1 className="text-sm font-bold">{receiptTranslations.shopName}</h1>
                <p>Jl. Inovasi No. 1, Kota Teknologi</p>
                <p>0812-3456-7890</p>
            </header>

            <hr className="border-t border-dashed border-black my-2" />

            <section className="mb-2">
                <div className="flex justify-between">
                    <span>{receiptTranslations.date}</span>
                    <span>{format(new Date(), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                    <span>{receiptTranslations.receiptNo}</span>
                    <span>{receipt.transactionId.slice(-8)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>{receiptTranslations.cashier}</span>
                    <span>Admin</span>
                </div>
            </section>
            
            <hr className="border-t border-dashed border-black my-2" />

            <section>
                {receipt.items.map(item => (
                    <div key={item.id} className="mb-1">
                        <p className="font-bold">{item.productName}{item.name !== item.productName && ` - ${item.name}`}</p>
                        <div className="flex justify-between items-center">
                            <span>{item.quantity} x {formatCurrency(item.price)}</span>
                            <span className="text-right">{formatCurrency(item.quantity * item.price)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="border-t border-dashed border-black my-2" />

            <section className="space-y-1">
                <div className="flex justify-between">
                    <span>{receiptTranslations.subtotal}</span>
                    <span className="text-right">{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                    <div className="flex justify-between">
                        <span>{receiptTranslations.discount}</span>
                        <span className="text-right">-{formatCurrency(receipt.discount)}</span>
                    </div>
                )}
                 <div className="flex justify-between font-bold">
                    <span>{receiptTranslations.grandTotal}</span>
                    <span className="text-right">{formatCurrency(receipt.total)}</span>
                </div>
            </section>

            <hr className="border-t border-dashed border-black my-2" />
            
            <section className="space-y-1">
                <div className="flex justify-between">
                    <span>{receiptTranslations.paymentMethod}</span>
                    <span className="text-right">{receipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                    <span>{receiptTranslations.cash}</span>
                    <span className="text-right">{formatCurrency(receipt.cashReceived)}</span>
                </div>
                <div className="flex justify-between">
                    <span>{receiptTranslations.change}</span>
                    <span className="text-right">{formatCurrency(receipt.change)}</span>
                </div>
            </section>
            
            <footer className="text-center mt-4">
                <p>{receiptTranslations.thankYou}</p>
            </footer>
        </div>
    );
});

PosReceipt.displayName = 'PosReceipt';

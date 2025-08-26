
'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { CartItem } from './pos-cart';
import { format } from 'date-fns';
import { useReceiptSettings, type ReceiptSettings } from '@/hooks/use-receipt-settings';
import { cn } from '@/lib/utils';

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
    previewSettings?: Partial<ReceiptSettings>;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
};

export const PosReceipt = React.forwardRef<HTMLDivElement, PosReceiptProps>((props, ref) => {
    const { receipt, previewSettings } = props;
    const { language } = useLanguage();
    const t = translations[language];
    const receiptTranslations = t.receipt;
    const { settings: globalSettings } = useReceiptSettings();

    const settings = previewSettings ? { ...globalSettings, ...previewSettings } : globalSettings;
    
    // State to hold the date, initialized after client-side mount to prevent hydration errors.
    const [displayDate, setDisplayDate] = useState<Date | null>(null);

    useEffect(() => {
      // Set the date only on the client side.
      setDisplayDate(new Date());
    }, []);


    return (
        <div ref={ref} className={cn("bg-white text-black font-mono p-2 mx-auto", `receipt-${settings.paperSize}`)}>
            <header className="text-center mb-2">
                <h1 className="text-sm font-bold">{settings.shopName}</h1>
                <p className="text-[0.8em]">{settings.addressLine1}</p>
                <p>{settings.phone}</p>
            </header>

            <hr className="border-t border-dashed border-black my-2" />

            <section className="mb-2">
                <div className="flex justify-between">
                    <span>{receiptTranslations.date}</span>
                    {/* Only render the date once it has been set on the client */}
                    <span>{displayDate ? format(displayDate, 'dd/MM/yy HH:mm') : ''}</span>
                </div>
                <div className="flex justify-between">
                    <span>{receiptTranslations.receiptNo}</span>
                    <span>{receipt.transactionId.slice(-8)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>{receiptTranslations.cashier}</span>
                    <span>{settings.cashierName}</span>
                </div>
            </section>
            
            <hr className="border-t border-dashed border-black my-2" />

            <section>
                {receipt.items.map(item => {
                    const isVariant = !!item.variantName && item.variantName !== item.productName;
                    return (
                        <div key={item.id} className="mb-1">
                            <p className="font-bold">{item.productName}</p>
                            <div className="flex justify-between items-center">
                                <span>
                                    {isVariant ? `${item.name} ` : ''}{item.quantity} x {formatCurrency(item.price)}
                                </span>
                                <span className="text-right">{formatCurrency(item.quantity * item.price)}</span>
                            </div>
                        </div>
                    );
                })}
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

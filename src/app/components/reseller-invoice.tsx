
'use client';

import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { CartItem } from './pos-cart';
import type { Reseller } from '@/types';
import { formatToWIB } from '@/lib/utils';
import { useInvoiceSettings } from '@/hooks/use-invoice-settings';
import { Logo } from './logo';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead, TableFooter } from '@/components/ui/table';

export interface InvoiceData {
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    transactionId: string;
    reseller: Reseller;
}

interface ResellerInvoiceProps {
    invoice: InvoiceData;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const ResellerInvoice = React.forwardRef<HTMLDivElement, ResellerInvoiceProps>((props, ref) => {
    const { invoice } = props;
    const { settings } = useInvoiceSettings();
    const [displayDate, setDisplayDate] = React.useState('');

    React.useEffect(() => {
      // Set the date only on the client side to prevent hydration mismatch
      setDisplayDate(formatToWIB(new Date(), 'dd MMMM yyyy'));
    }, []);

    return (
        <div ref={ref} id={`invoice-${invoice.transactionId}`} className="bg-white text-black p-8 font-sans">
             <style type="text/css" media="print">
                {`
                  @page { 
                    size: A4 portrait;
                    margin: 2cm;
                  }
                  body {
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                `}
            </style>
            <header className="flex justify-between items-start pb-4 border-b-2 border-black">
                <div className="flex items-center gap-4">
                    <Logo />
                </div>
                 <div className="text-right">
                    <h1 className="text-3xl font-bold uppercase tracking-wider">Invoice</h1>
                    <p className="text-sm mt-1">{settings.shopName}</p>
                    <p className="text-xs text-gray-600">{settings.address}</p>
                    <p className="text-xs text-gray-600">{settings.phone}</p>
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Ditagih Kepada:</h2>
                    <p className="font-bold text-base">{invoice.reseller.name}</p>
                    <p className="text-sm">{invoice.reseller.address}</p>
                    <p className="text-sm">{invoice.reseller.phone}</p>
                </div>
                 <div className="text-right">
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">No. Invoice</h2>
                    <p className="text-base">INV-{invoice.transactionId.slice(-8)}</p>
                    <h2 className="text-sm font-semibold uppercase mt-4 mb-2 text-gray-600">Tanggal Invoice</h2>
                    <p className="text-base">{displayDate}</p>
                </div>
            </section>
            
            <section>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            <TableHead className="w-[50%] text-black font-semibold">Deskripsi</TableHead>
                            <TableHead className="text-center text-black font-semibold">Jumlah</TableHead>
                            <TableHead className="text-right text-black font-semibold">Harga Satuan</TableHead>
                            <TableHead className="text-right text-black font-semibold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map(item => (
                            <TableRow key={item.id} className="border-b">
                                <TableCell className="py-3">
                                    <p className="font-medium">{item.productName}</p>
                                    <p className="text-xs text-gray-600">{item.name} (SKU: {item.sku || 'N/A'})</p>
                                </TableCell>
                                <TableCell className="text-center py-3">{item.quantity}</TableCell>
                                <TableCell className="text-right py-3">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right py-3">{formatCurrency(item.quantity * item.price)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 <div className="w-full flex justify-end pt-4">
                    <div className="w-1/2">
                        <div className="flex justify-between py-1">
                            <span className="text-sm">Subtotal</span>
                            <span className="text-sm">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-sm">Diskon</span>
                            <span className="text-sm text-red-600">{formatCurrency(-invoice.discount)}</span>
                        </div>
                         <div className="border-t border-black my-2"></div>
                        <div className="flex justify-between py-1 font-bold">
                            <span className="text-base">Total Tagihan</span>
                            <span className="text-base">{formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                </div>
            </section>

             <section className="mt-12">
                <h3 className="font-semibold mb-2">Keterangan:</h3>
                <div className="text-xs border p-4 rounded-md space-y-2 bg-gray-50">
                    <div>
                        <p className="font-semibold">Informasi Pembayaran:</p>
                        <p>{settings.bankName}: <span className="font-bold">{settings.accountNumber}</span> a/n {settings.accountHolder}</p>
                    </div>
                    {settings.termsAndConditions && (
                         <div>
                            <p className="font-semibold">Syarat & Ketentuan:</p>
                            <p className="whitespace-pre-line">{settings.termsAndConditions}</p>
                         </div>
                    )}
                </div>
            </section>

             <footer className="text-center mt-12 pt-4 border-t">
                <p className="text-sm font-semibold">Terima kasih atas kerja samanya.</p>
                <p className="text-xs mt-1">{settings.shopName}</p>
             </footer>
        </div>
    );
});

ResellerInvoice.displayName = 'ResellerInvoice';

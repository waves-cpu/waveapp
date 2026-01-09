
'use client';

import React, { useEffect, useState } from 'react';
import { formatToWIB } from '@/lib/utils';
import { Logo } from './logo';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useInvoiceSettings } from '@/hooks/use-invoice-settings';

export type InvoiceData = {
    resellerName?: string;
    resellerAddress?: string;
    resellerPhone?: string;
    items: {
        productName: string;
        variantName: string;
        quantity: number;
        price: number;
        total: number;
    }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    transactionId: string;
};

interface ResellerInvoiceProps {
    invoice: InvoiceData;
}

export const ResellerInvoice = React.forwardRef<HTMLDivElement, ResellerInvoiceProps>((props, ref) => {
    const { invoice } = props;
    const { settings: invoiceSettings } = useInvoiceSettings();
    const [displayDate, setDisplayDate] = useState<string>('');

    useEffect(() => {
        setDisplayDate(formatToWIB(new Date(), 'dd MMMM yyyy'));
    }, []);

    const formatCurrency = (amount: number) => `Rp ${Math.round(amount).toLocaleString('id-ID')}`;

    return (
        <div ref={ref} id={`invoice-${invoice.transactionId}`} className="bg-white text-black p-8 font-sans a4-page">
            <style type="text/css" media="print">
                {`
                  @page { 
                    size: A4 portrait;
                    margin: 1.5cm;
                  }
                  body {
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                  }
                  .a4-page {
                      width: 21cm;
                      height: 29.7cm;
                  }
                `}
            </style>
            <header className="flex justify-between items-start pb-6 border-b-2 border-black">
                <div>
                    <h1 className="text-4xl font-bold uppercase tracking-wider">Invoice</h1>
                    <p className="text-sm text-gray-600 mt-1">INV/{new Date().getFullYear()}/{invoice.transactionId.slice(-8)}</p>
                </div>
                <div className="text-right">
                    <Logo />
                    <p className="text-xs mt-2">{invoiceSettings.address}</p>
                    <p className="text-xs">{invoiceSettings.phone}</p>
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Ditagihkan kepada</h2>
                    <p className="font-bold">{invoice.resellerName}</p>
                    <p className="text-sm">{invoice.resellerAddress}</p>
                    <p className="text-sm">{invoice.resellerPhone}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Tanggal Invoice</h2>
                    <p className="text-base">{displayDate}</p>
                </div>
            </section>
            
            <section>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            <TableHead className="w-[60%] text-black font-semibold">Deskripsi</TableHead>
                            <TableHead className="text-center text-black font-semibold">Jumlah</TableHead>
                            <TableHead className="text-right text-black font-semibold">Harga Satuan</TableHead>
                            <TableHead className="text-right text-black font-semibold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map((item, index) => (
                            <TableRow key={index} className="border-b">
                                <TableCell className="py-3 font-medium">
                                    {item.productName}
                                    {item.variantName && <span className="text-gray-500"> - {item.variantName}</span>}
                                </TableCell>
                                <TableCell className="text-center py-3">{item.quantity}</TableCell>
                                <TableCell className="text-right py-3">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right py-3">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>
            
            <section className="mt-8 flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal</span>
                        <span className="text-sm">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Diskon</span>
                        <span className="text-sm text-red-600">-{formatCurrency(invoice.discount)}</span>
                    </div>
                    <Separator className="my-2 bg-black" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total)}</span>
                    </div>
                </div>
            </section>

             <section className="mt-16 text-sm">
                <h3 className="font-bold mb-2">Informasi Pembayaran</h3>
                <p>{invoiceSettings.bankName}</p>
                <p>No. Rekening: {invoiceSettings.accountNumber}</p>
                <p>A/N: {invoiceSettings.accountHolder}</p>
            </section>
            
             <footer className="absolute bottom-8 left-8 right-8 text-xs text-gray-500">
                <Separator className="mb-4" />
                <h4 className="font-semibold mb-1">Syarat & Ketentuan</h4>
                <p className="whitespace-pre-line">{invoiceSettings.termsAndConditions}</p>
            </footer>

        </div>
    );
});

ResellerInvoice.displayName = 'ResellerInvoice';

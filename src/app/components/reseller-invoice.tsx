
'use client';

import React, { useEffect, useState } from 'react';
import type { CartItem } from './pos-cart';
import type { Reseller } from '@/types';
import { formatToWIB } from '@/lib/utils';
import { useInvoiceSettings, type InvoiceSettings } from '@/hooks/use-invoice-settings';
import { Logo } from './logo';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead, TableFooter } from '@/components/ui/table';

export type InvoiceData = {
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    transactionId: string;
    reseller: Reseller;
};

interface ResellerInvoiceProps {
    invoice: InvoiceData;
}

const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;

export const ResellerInvoice = React.forwardRef<HTMLDivElement, ResellerInvoiceProps>((props, ref) => {
    const { invoice } = props;
    const { settings: invoiceSettings } = useInvoiceSettings();
    const [displayDate, setDisplayDate] = useState('');

    useEffect(() => {
        setDisplayDate(formatToWIB(new Date(), 'dd MMMM yyyy'));
    }, []);

    const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0);

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
                      min-height: 29.7cm;
                  }
                `}
            </style>
            <header className="flex justify-between items-start pb-4 border-b-2 border-black">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wider">Invoice</h1>
                    <p className="text-sm text-gray-600 mt-1">No: INV-{invoice.transactionId.slice(-8)}</p>
                </div>
                <div className="text-right">
                    <Logo />
                    <p className="text-xs mt-2">{invoiceSettings.address}</p>
                    <p className="text-xs">{invoiceSettings.phone}</p>
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Ditagihkan Kepada:</h2>
                    <p className="font-bold">{invoice.reseller.name}</p>
                    <p className="text-sm">{invoice.reseller.address || 'Alamat tidak tersedia'}</p>
                    <p className="text-sm">{invoice.reseller.phone || 'No. HP tidak tersedia'}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Tanggal Faktur</h2>
                    <p className="text-base">{displayDate}</p>
                </div>
            </section>
            
            <section>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            <TableHead className="w-[60%] text-black font-semibold">Deskripsi Barang</TableHead>
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
                                    <p className="text-xs text-gray-600">{item.variantName ? `Varian: ${item.variantName}` : ''} (SKU: {item.sku})</p>
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={3} className="text-right pt-4 font-medium">Subtotal</TableCell>
                            <TableCell className="text-right pt-4">{formatCurrency(invoice.subtotal)}</TableCell>
                        </TableRow>
                        {invoice.discount > 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Diskon</TableCell>
                                <TableCell className="text-right">-{formatCurrency(invoice.discount)}</TableCell>
                            </TableRow>
                        )}
                        <TableRow className="font-bold text-lg">
                            <TableCell colSpan={3} className="text-right border-t-2 border-black">Total</TableCell>
                            <TableCell className="text-right border-t-2 border-black">{formatCurrency(invoice.total)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </section>

             <footer className="mt-16 text-xs text-gray-600">
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-2 text-black">Informasi Pembayaran:</h3>
                    <p>Bank: {invoiceSettings.bankName}</p>
                    <p>No. Rekening: {invoiceSettings.accountNumber}</p>
                    <p>Atas Nama: {invoiceSettings.accountHolder}</p>
                </div>
                 <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-sm mb-2 text-black">Syarat & Ketentuan:</h3>
                    <p className="whitespace-pre-wrap">{invoiceSettings.termsAndConditions}</p>
                </div>
                <div className="text-center mt-8 pt-4 border-t">
                    <p>Terima kasih atas kerja samanya.</p>
                </div>
            </footer>
        </div>
    );
});

ResellerInvoice.displayName = 'ResellerInvoice';

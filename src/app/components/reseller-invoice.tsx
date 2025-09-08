
'use client';

import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { CartItem } from './pos-cart';
import type { Reseller } from '@/types';
import { format } from 'date-fns';
import { useReceiptSettings } from '@/hooks/use-receipt-settings';
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
    const { settings } = useReceiptSettings();
    const [displayDate, setDisplayDate] = React.useState('');

    React.useEffect(() => {
      // Set the date only on the client side to prevent hydration mismatch
      setDisplayDate(format(new Date(), 'dd MMMM yyyy'));
    }, []);

    return (
        <div ref={ref} className="bg-white text-black p-8 font-sans">
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
                    <h1 className="text-2xl font-bold uppercase">Invoice</h1>
                    <p className="text-sm">No: {invoice.transactionId.slice(-8)}</p>
                    <p className="text-sm">Tanggal: {displayDate}</p>
                </div>
            </header>

            <section className="my-6 grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2">Ditagih Kepada:</h2>
                    <p className="font-bold text-base">{invoice.reseller.name}</p>
                    <p className="text-sm">{invoice.reseller.address}</p>
                    <p className="text-sm">{invoice.reseller.phone}</p>
                </div>
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2">Dari:</h2>
                    <p className="font-bold text-base">{settings.shopName}</p>
                    <p className="text-sm">{settings.addressLine1}</p>
                    <p className="text-sm">{settings.phone}</p>
                </div>
            </section>
            
            <section>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-100">
                            <TableHead className="w-[50%] text-black font-semibold">Deskripsi</TableHead>
                            <TableHead className="text-center text-black font-semibold">Jumlah</TableHead>
                            <TableHead className="text-right text-black font-semibold">Harga Satuan</TableHead>
                            <TableHead className="text-right text-black font-semibold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map(item => (
                            <TableRow key={item.id} className="border-b">
                                <TableCell>
                                    <p className="font-medium">{item.productName}</p>
                                    <p className="text-xs text-gray-600">{item.name} (SKU: {item.sku})</p>
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.quantity * item.price)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                            <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell colSpan={3} className="text-right font-semibold">Diskon</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(-invoice.discount)}</TableCell>
                        </TableRow>
                         <TableRow className="text-base font-bold bg-gray-100">
                            <TableCell colSpan={3} className="text-right">Total Tagihan</TableCell>
                            <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </section>

             <section className="mt-8">
                <h3 className="font-semibold mb-2">Keterangan:</h3>
                <div className="text-xs border p-4 rounded-md">
                    <p>1. Pembayaran dapat dilakukan melalui transfer ke rekening berikut:</p>
                    <p className="font-semibold ml-4">BCA - 1234567890 a/n {settings.shopName}</p>
                    <p>2. Mohon lakukan konfirmasi pembayaran setelah transfer.</p>
                    <p>3. Faktur ini sah dan diproses dengan komputer.</p>
                </div>
            </section>

             <footer className="text-center mt-10 pt-4 border-t">
                <p className="text-sm font-semibold">Terima kasih atas kerja samanya.</p>
             </footer>
        </div>
    );
});

ResellerInvoice.displayName = 'ResellerInvoice';

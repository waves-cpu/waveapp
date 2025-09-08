
'use client';

import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { CartItem } from './pos-cart';
import type { Reseller } from '@/types';
import { format } from 'date-fns';
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
      setDisplayDate(format(new Date(), 'dd MMMM yyyy'));
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
                <div className="text-xs border p-4 rounded-md space-y-1">
                    <p className="font-semibold">Informasi Pembayaran:</p>
                    <p>{settings.bankName}: <span className="font-bold">{settings.accountNumber}</span> a/n {settings.accountHolder}</p>
                    <p className="pt-2">{settings.termsAndConditions}</p>
                </div>
            </section>

             <footer className="text-center mt-10 pt-4 border-t">
                <p className="text-sm font-semibold">Terima kasih atas kerja samanya.</p>
                <p className="text-xs mt-1">{settings.shopName}</p>
             </footer>
        </div>
    );
});

ResellerInvoice.displayName = 'ResellerInvoice';

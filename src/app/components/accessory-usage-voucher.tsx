
'use client';

import React, { useEffect, useState } from 'react';
import type { CartItem } from './pos-cart';
import { formatToWIB } from '@/lib/utils';
import { Logo } from './logo';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead, TableFooter } from '@/components/ui/table';

export type VoucherData = {
    items: CartItem[];
    transactionId: string;
    date: Date;
};

interface AccessoryVoucherProps {
    voucher: VoucherData;
}

export const AccessoryUsageVoucher = React.forwardRef<HTMLDivElement, AccessoryVoucherProps>((props, ref) => {
    const { voucher } = props;
    const [displayDate, setDisplayDate] = useState<string>('');

    useEffect(() => {
        setDisplayDate(formatToWIB(voucher.date, 'dd MMMM yyyy, HH:mm'));
    }, [voucher.date]);

    const totalItems = voucher.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div ref={ref} id={`voucher-${voucher.transactionId}`} className="bg-white text-black p-8 font-sans a4-page">
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
            <header className="flex justify-between items-start pb-4 border-b-2 border-black">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider">Voucher Pengambilan Barang</h1>
                    <p className="text-sm text-gray-600 mt-1">Digunakan untuk keperluan internal</p>
                </div>
                <div className="text-right">
                    <Logo />
                </div>
            </header>

            <section className="my-8 grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Nomor Voucher</h2>
                    <p className="text-base font-mono">VCH-{voucher.transactionId.slice(-8)}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-sm font-semibold uppercase mb-2 text-gray-600">Tanggal</h2>
                    <p className="text-base">{displayDate}</p>
                </div>
            </section>
            
            <section>
                <p className="mb-2">Telah diambil barang-barang aksesoris berikut dari gudang untuk keperluan operasional:</p>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            <TableHead className="w-[60%] text-black font-semibold">Nama Aksesoris</TableHead>
                            <TableHead className="text-left text-black font-semibold">SKU</TableHead>
                            <TableHead className="text-center text-black font-semibold">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {voucher.items.map(item => (
                            <TableRow key={item.id} className="border-b">
                                <TableCell className="py-3 font-medium">{item.productName}</TableCell>
                                <TableCell className="py-3">{item.sku}</TableCell>
                                <TableCell className="text-center py-3">{item.quantity} {item.unit || ''}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold">Total Item</TableCell>
                            <TableCell className="text-center font-bold">{totalItems}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </section>

             <section className="mt-16 grid grid-cols-3 gap-8 text-center">
                 <div>
                    <p className="mb-12">Yang Mengambil,</p>
                    <p>( .......................... )</p>
                 </div>
                 <div>
                    <p className="mb-12">Disetujui Oleh,</p>
                    <p>( .......................... )</p>
                 </div>
                  <div>
                    <p className="mb-12">Bagian Gudang,</p>
                    <p>( .......................... )</p>
                 </div>
            </section>
        </div>
    );
});

AccessoryUsageVoucher.displayName = 'AccessoryUsageVoucher';

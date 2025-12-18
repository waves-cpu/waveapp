'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ReceiptRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const today = format(new Date(), 'MM-dd-yyyy');
        router.replace(`/shipping/receipt/${today}`);
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <p>Loading receipts for today...</p>
        </div>
    );
}

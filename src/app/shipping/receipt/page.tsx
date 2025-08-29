
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// This component now acts as a redirector to the dynamic date route.
export default function ReceiptRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const today = new Date();
    const formattedDate = format(today, 'MM-dd-yyyy');
    router.replace(`/shipping/receipt/${formattedDate}`);
  }, [router]);

  return null; // Render nothing, as the user will be redirected.
}

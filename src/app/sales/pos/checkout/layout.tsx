
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout POS - WaveApp',
  description: 'Point of Sale Checkout',
};

export default function PosCheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}

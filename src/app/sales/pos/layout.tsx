
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS - WaveApp',
  description: 'Point of Sale',
};

export default function PosLayout({
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


'use client';

import { AppLayout } from '@/app/components/app-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

export default function ShippingReportPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppLayout>
      <main className="flex-1 p-4 md:p-10">
        <div className="flex items-center gap-4 mb-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-bold">{t.shipping.report}</h1>
        </div>
         <div className="text-center py-20">
          <p>Halaman untuk Laporan Resi.</p>
        </div>
      </main>
    </AppLayout>
  );
}

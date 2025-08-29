
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from './components/app-layout';
import Dashboard from './components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    // This effect should only run on the client after `isMobile` has been determined.
    if (isMobile === true) {
      router.replace('/mobile');
    }
  }, [isMobile, router]);

  // If isMobile is still undefined, it means we are either on the server or in the initial client render.
  // Show a loader to prevent a flash of the wrong content.
  if (isMobile === undefined) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Skeleton className="h-full w-full" />
        </div>
    );
  }

  // If it's mobile, we show a loader while the redirect is happening.
  // The redirect itself is triggered by the useEffect.
  if (isMobile === true) {
    return (
        <div className="flex items-center justify-center h-screen">
           <p>Redirecting to mobile experience...</p>
        </div>
    );
  }
  
  // If it's not mobile (and not undefined), show the full desktop dashboard.
  return (
    <AppLayout>
        <Dashboard />
    </AppLayout>
  );
}

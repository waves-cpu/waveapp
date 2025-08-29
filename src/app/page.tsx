
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

  if (isMobile === true) {
    // While redirecting, show a loader.
    return (
        <div className="flex items-center justify-center h-screen">
           <p>Redirecting to mobile experience...</p>
        </div>
    )
  }
  
  if (isMobile === false) {
    // Desktop view
    return (
        <AppLayout>
            <Dashboard />
        </AppLayout>
    );
  }

  // Fallback for when isMobile is undefined (during server-side render and initial client-side mount)
  return (
    <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-full w-full" />
    </div>
  )
}

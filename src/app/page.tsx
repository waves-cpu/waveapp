
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
    if (isMobile === true) { // Explicitly check for true, as it can be undefined initially
      router.replace('/mobile');
    }
  }, [isMobile, router]);

  // While `isMobile` is being determined on the client, show a loader or nothing.
  // Or, show the desktop layout and let it be replaced on mobile.
  // Showing a loader prevents a "flash" of the desktop UI on mobile.
  if (isMobile === true) {
    // This will be shown for a brief moment on mobile before redirection.
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

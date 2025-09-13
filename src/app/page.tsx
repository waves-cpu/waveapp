
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLayout } from './components/app-layout';
import Dashboard from './components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be determined

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    if (isMobile === true) {
      router.replace('/mobile');
    }
  }, [isMobile, router, isAuthenticated, authLoading]);

  // If auth is loading, or mobile state is undetermined, show a loader.
  if (authLoading || isMobile === undefined) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Skeleton className="h-full w-full" />
        </div>
    );
  }

  // If it's mobile and authenticated, show loader while redirecting.
  if (isMobile === true) {
    return (
        <div className="flex items-center justify-center h-screen">
           <p>Redirecting to mobile experience...</p>
        </div>
    );
  }
  
  // If authenticated and not mobile, show the desktop dashboard.
  if (isAuthenticated) {
    return (
      <AppLayout>
          <Dashboard />
      </AppLayout>
    );
  }

  // Fallback, though the useEffect should handle the redirect.
  return null;
}

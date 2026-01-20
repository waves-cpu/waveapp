'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export function Logo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // To avoid hydration mismatch, we only render the theme-specific logo on the client
  if (!mounted) {
    // Render a placeholder or a default to prevent layout shift
    return (
      <div className="flex items-center gap-2 font-bold text-xl text-foreground">
        <div className="h-8 w-8" />
        <span className="font-headline">Waveblast</span>
      </div>
    );
  }

  const logoSrc = resolvedTheme === 'dark' 
    ? "/icons/springs_light.png" 
    : "/icons/springs.png";

  return (
    <div className="flex items-center gap-2 font-bold text-xl text-foreground">
      <Image
        src={logoSrc}
        alt="Waveblast Logo"
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className="font-headline">Waveblast</span>
    </div>
  );
}

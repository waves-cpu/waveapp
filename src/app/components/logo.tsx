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
        <Image src="/icons/logos.png" alt="Waveblast" width={140} height={32} />
      </div>
    );
  }

  const iconSrc = resolvedTheme === 'dark' 
    ? "/icons/apple-touch-icon_light.png" 
    : "/icons/apple-touch-icon_dark.png";
    
  const textLogoSrc = resolvedTheme === 'dark'
    ? "/icons/logos_white.png"
    : "/icons/logos.png";

  return (
    <div className="flex items-center gap-2 font-bold text-xl text-foreground">
      <Image
        src={iconSrc}
        alt="Waveblast Logo"
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <Image src={textLogoSrc} alt="Waveblast" width={140} height={32} />
    </div>
  );
}

import React from 'react';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-bold text-xl text-foreground">
      <Image
        src="/icons/basic.png"
        alt="Waveblast Logo"
        width={32}
        height={32}
        className="h-8 w-8" 
        />
        <span className="font-headline">Waveblast</span>
    </div>
  );
  
}

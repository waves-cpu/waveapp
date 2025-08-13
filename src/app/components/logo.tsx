import React from 'react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 font-bold text-xl text-primary">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
        >
            <path d="M3 12h.01" />
            <path d="M7 12h.01" />
            <path d="M11 12h.01" />
            <path d="M15 12h.01" />
            <path d="M19 12h.01" />
            <path d="M4 17h.01" />
            <path d="M8 17h.01" />
            <path d="M12 17h.01" />
            <path d="M16 17h.01" />
            <path d="M20 17h.01" />
            <path d="M5 7h.01" />
            <path d="M9 7h.01" />
            <path d="M13 7h.01" />
            <path d="M17 7h.01" />
            <path d="M21 7h.01" />
        </svg>
      <span className="font-headline">WaveApp</span>
    </div>
  );
}


'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useScanSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Function to initialize AudioContext, should be called on first user interaction
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser", e);
      }
    }
  }, []);

  useEffect(() => {
    // Add event listener for the first user interaction to initialize audio
    document.body.addEventListener('click', initializeAudio, { once: true });
    document.body.addEventListener('keydown', initializeAudio, { once: true });
    
    return () => {
      document.body.removeEventListener('click', initializeAudio);
      document.body.removeEventListener('keydown', initializeAudio);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [initializeAudio]);
  

  const playSound = useCallback((type: 'success' | 'error') => {
    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
      audioContextRef.current?.resume();
    }
    
    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.15);
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(220, context.currentTime); // A3 note
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    }
  }, []);

  const playSuccessSound = useCallback(() => {
    playSound('success');
  }, [playSound]);

  const playErrorSound = useCallback(() => {
    playSound('error');
  }, [playSound]);

  return { playSuccessSound, playErrorSound, initializeAudio };
}

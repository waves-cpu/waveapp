
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Start with a default language, and don't try to access localStorage yet.
  const [language, setLanguageState] = useState<Language>('en');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client.
    setIsClient(true);
    const storedLanguage = localStorage.getItem('language') as Language | null;
    if (storedLanguage && ['en', 'id'].includes(storedLanguage)) {
      setLanguageState(storedLanguage);
    }
  }, []);

  useEffect(() => {
    // This effect ensures that if the language is changed in another tab, it syncs up.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'language' && event.newValue && ['en', 'id'].includes(event.newValue)) {
        setLanguageState(event.newValue as Language);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = (newLanguage: Language) => {
    try {
      localStorage.setItem('language', newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.error("Could not set language in localStorage", error);
    }
  };

  // On the server, and on the very first client render, `isClient` will be false.
  // We provide a stable 'en' value until the client-side effect can run.
  const contextValue = {
    language: isClient ? language : 'en',
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

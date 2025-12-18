"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('id');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const storedLanguage = localStorage.getItem('language') as Language | null;
      if (storedLanguage && ['en', 'id'].includes(storedLanguage)) {
        setLanguageState(storedLanguage);
      }
    }
  }, [isClient]);

  const setLanguage = (newLanguage: Language) => {
    if (isClient) {
        try {
            localStorage.setItem('language', newLanguage);
            setLanguageState(newLanguage);
        } catch (error) {
            console.error("Could not set language in localStorage", error);
        }
    }
  };
  
  const contextValue = {
    language: language,
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

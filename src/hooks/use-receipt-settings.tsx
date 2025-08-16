
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ReceiptSettings {
    shopName: string;
    addressLine1: string;
    phone: string;
    cashierName: string;
    paperSize: '80mm' | '58mm';
}

interface ReceiptSettingsContextType {
    settings: ReceiptSettings;
    setSettings: (newSettings: ReceiptSettings) => void;
    isLoaded: boolean;
}

const defaultSettings: ReceiptSettings = {
    shopName: 'WaveApp Store',
    addressLine1: 'Jl. Inovasi No. 1, Kota Teknologi',
    phone: '0812-3456-7890',
    cashierName: 'Admin',
    paperSize: '80mm'
};

const LOCAL_STORAGE_KEY = 'receiptSettings';

const ReceiptSettingsContext = createContext<ReceiptSettingsContextType | undefined>(undefined);

export const ReceiptSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<ReceiptSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSettings) {
                setSettingsState(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error("Failed to load receipt settings from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    const setSettings = (newSettings: ReceiptSettings) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
            setSettingsState(newSettings);
        } catch (error) {
             console.error("Failed to save receipt settings to localStorage", error);
        }
    };

    return (
        <ReceiptSettingsContext.Provider value={{ settings, setSettings, isLoaded }}>
            {children}
        </ReceiptSettingsContext.Provider>
    );
};

export const useReceiptSettings = () => {
    const context = useContext(ReceiptSettingsContext);
    if (!context) {
        throw new Error('useReceiptSettings must be used within a ReceiptSettingsProvider');
    }
    return context;
};


'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from './use-toast';

async function apiFetch(url: string, options: RequestInit = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'secret-api-key-for-waveapp',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message);
    }
    if(res.status === 204) return null;
    return res.json();
}


export interface FinanceSettings {
    marketplaceFee: number; // Stored as a percentage, e.g., 3.2 for 3.2%
}

interface FinanceSettingsContextType {
    settings: FinanceSettings;
    setSettings: (newSettings: FinanceSettings) => Promise<void>;
    isLoaded: boolean;
}

const defaultSettings: FinanceSettings = {
    marketplaceFee: 3.2,
};

const SETTINGS_KEY = 'financeSettings';

const FinanceSettingsContext = createContext<FinanceSettingsContextType | undefined>(undefined);

export const FinanceSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<FinanceSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const savedSettings = await apiFetch(`/api/settings/${SETTINGS_KEY}`);
            if (savedSettings) {
                setSettingsState(savedSettings);
            }
        } catch (error) {
            console.error("Failed to fetch finance settings:", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const setSettings = async (newSettings: FinanceSettings) => {
        try {
            await apiFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify({ key: SETTINGS_KEY, value: newSettings }),
            });
            setSettingsState(newSettings);
            toast({
                title: "Pengaturan Disimpan",
                description: "Pengaturan keuangan Anda telah berhasil diperbarui.",
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan pengaturan.",
            });
            throw error;
        }
    };

    return (
        <FinanceSettingsContext.Provider value={{ settings, setSettings, isLoaded }}>
            {children}
        </FinanceSettingsContext.Provider>
    );
};

export const useFinanceSettings = () => {
    const context = useContext(FinanceSettingsContext);
    if (!context) {
        throw new Error('useFinanceSettings must be used within a FinanceSettingsProvider');
    }
    return context;
};

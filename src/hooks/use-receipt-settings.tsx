
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from './use-toast';
import { apiFetch } from '@/lib/api';

export interface ReceiptSettings {
    shopName: string;
    addressLine1: string;
    phone: string;
    cashierName: string;
    paperSize: '80mm' | '58mm';
}

interface ReceiptSettingsContextType {
    settings: ReceiptSettings;
    setSettings: (newSettings: ReceiptSettings) => Promise<void>;
    isLoaded: boolean;
}

const defaultSettings: ReceiptSettings = {
    shopName: 'WaveApp Store',
    addressLine1: 'Jl. Inovasi No. 1, Kota Teknologi',
    phone: '0812-3456-7890',
    cashierName: 'Admin',
    paperSize: '80mm'
};

const SETTINGS_KEY = 'receiptSettings';

const ReceiptSettingsContext = createContext<ReceiptSettingsContextType | undefined>(undefined);

export const ReceiptSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<ReceiptSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const savedSettings = await apiFetch(`/api/settings/${SETTINGS_KEY}`);
            if (savedSettings) {
                setSettingsState(savedSettings);
            }
        } catch (error) {
             console.error("Failed to fetch receipt settings:", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const setSettings = async (newSettings: ReceiptSettings) => {
        try {
             await apiFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify({ key: SETTINGS_KEY, value: newSettings }),
            });
            setSettingsState(newSettings);
             toast({
                title: "Pengaturan Disimpan",
                description: "Pengaturan struk Anda telah berhasil diperbarui ke database.",
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan pengaturan ke database.",
            });
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

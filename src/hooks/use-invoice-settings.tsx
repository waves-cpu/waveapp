
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getSetting, saveSetting } from '@/lib/inventory-service';
import { useToast } from './use-toast';

export interface InvoiceSettings {
    shopName: string;
    address: string;
    phone: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    termsAndConditions: string;
}

interface InvoiceSettingsContextType {
    settings: InvoiceSettings;
    setSettings: (newSettings: InvoiceSettings) => Promise<void>;
    isLoaded: boolean;
}

const defaultSettings: InvoiceSettings = {
    shopName: 'WaveApp Store',
    address: 'Jl. Inovasi No. 1, Kota Teknologi',
    phone: '0812-3456-7890',
    bankName: 'Bank Central Asia (BCA)',
    accountNumber: '123-456-7890',
    accountHolder: 'WaveApp Store',
    termsAndConditions: '1. Pembayaran harus dilakukan dalam waktu 7 hari setelah tanggal faktur.\n2. Barang yang sudah dibeli tidak dapat dikembalikan kecuali ada perjanjian.'
};

const SETTINGS_KEY = 'invoiceSettings';

const InvoiceSettingsContext = createContext<InvoiceSettingsContextType | undefined>(undefined);

export const InvoiceSettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettingsState] = useState<InvoiceSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const savedSettings = await getSetting<InvoiceSettings>(SETTINGS_KEY);
            if (savedSettings) {
                setSettingsState(savedSettings);
            }
        } catch (error) {
            console.error("Failed to load invoice settings from database", error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const setSettings = async (newSettings: InvoiceSettings) => {
        try {
            await saveSetting(SETTINGS_KEY, newSettings);
            setSettingsState(newSettings);
             toast({
                title: "Pengaturan Disimpan",
                description: "Pengaturan faktur Anda telah berhasil diperbarui.",
            });
        } catch (error) {
             console.error("Failed to save invoice settings to database", error);
             toast({
                variant: 'destructive',
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan pengaturan.",
            });
            throw error;
        }
    };

    return (
        <InvoiceSettingsContext.Provider value={{ settings, setSettings, isLoaded }}>
            {children}
        </InvoiceSettingsContext.Provider>
    );
};

export const useInvoiceSettings = () => {
    const context = useContext(InvoiceSettingsContext);
    if (!context) {
        throw new Error('useInvoiceSettings must be used within a InvoiceSettingsProvider');
    }
    return context;
};

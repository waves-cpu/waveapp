
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import type { Sale, ShippingReceipt } from '@/types';
import { apiFetch } from '@/lib/api';
import { formatToWIB } from '@/lib/utils';

export function useReceiptPageLogic(salesChannel: 'Shopee' | 'Tiktok' | 'Lazada') {
    const params = useParams();
    const router = useRouter();
    const inventoryContext = useInventory();
    const { toast } = useToast();
    const { playSuccessSound, playErrorSound, playNotificationSound } = useScanSounds();
    const { language } = useLanguage();
    const t = translations[language];

    const shippingChannel = typeof params.channel === 'string' ? decodeURIComponent(params.channel).toUpperCase() : '';

    const [receipts, setReceipts] = useState<ShippingReceipt[]>([]);
    const [totalReceipts, setTotalReceipts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [awb, setAwb] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const awbInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const [detailItems, setDetailItems] = useState<Sale[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [receiptForSale, setReceiptForSale] = useState<Omit<ShippingReceipt, 'id'> | ShippingReceipt | null>(null);
    const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
    const prevIsSaleDialogOpen = useRef(isSaleDialogOpen);
    
    const refocusInput = useCallback(() => {
        setTimeout(() => awbInputRef.current?.focus(), 100);
    }, []);

    const loadReceipts = useCallback(async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            const { receipts: receiptsData, total } = await inventoryContext.fetchShippingReceipts({ 
                page: currentPage, 
                limit: itemsPerPage, 
                salesChannel: salesChannel,
                channel: shippingChannel, 
                awb: searchTerm,
                dateString: dateString
            });
            setReceipts(receiptsData);
            setTotalReceipts(total);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Gagal Memuat Resi',
                description: 'Terjadi kesalahan saat mengambil data resi.',
            });
        } finally {
            setLoading(false);
        }
    }, [inventoryContext, toast, currentPage, itemsPerPage, searchTerm, salesChannel, shippingChannel, selectedDate]);
    
    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);
    
    useEffect(() => {
      const eventSource = new EventSource('/api/stream');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new-receipt' || data.type === 'receipt-update') {
            playNotificationSound();
            loadReceipts();
        }
      };

      eventSource.onerror = () => {};

      return () => {
        eventSource.close();
      };
    }, [loadReceipts, playNotificationSound]);

    useEffect(() => {
        // Only refocus when the dialog has just closed.
        if (prevIsSaleDialogOpen.current && !isSaleDialogOpen) {
            refocusInput();
        }
        // Update the ref to the current value for the next render.
        prevIsSaleDialogOpen.current = isSaleDialogOpen;
    }, [isSaleDialogOpen, refocusInput]);
    
    const handleAwbSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedAwb = awb.trim().toUpperCase();
        
        if (!trimmedAwb || trimmedAwb.length < 5 || isSubmitting) return;
    
        setIsSubmitting(true);
        
        try {
            const existingReceipt = await inventoryContext.findShippingReceiptByAwb(trimmedAwb);

            if (existingReceipt) {
                playErrorSound();
                toast({
                    variant: "destructive",
                    title: 'Resi Sudah Ada',
                    description: `AWB ${trimmedAwb} sudah diinput pada ${formatToWIB(parseISO(existingReceipt.date), 'dd/MM/yyyy HH:mm')}`
                });
                setAwb('');
                return;
            }

            const newReceipt: Omit<ShippingReceipt, 'id'> = {
                awb: trimmedAwb,
                salesChannel: salesChannel,
                channel: shippingChannel,
                date: new Date().toISOString(),
                status: 'Perlu Diproses',
                transactionId: trimmedAwb
            };
            
            setReceiptForSale(newReceipt);
            setIsSaleDialogOpen(true);
            setAwb('');
            playSuccessSound();

        } catch (error: any) {
            playErrorSound();
            toast({ variant: "destructive", title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = async (receipt: ShippingReceipt) => {
        if (receipt.status !== 'Perlu Diproses') {
            try {
                const data = await apiFetch(`/api/sales/transaction/${receipt.transactionId}`);
                setDetailItems(data.sales);
                setIsDetailOpen(true);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Gagal Memuat Detail', description: 'Tidak dapat menemukan detail penjualan untuk resi ini.'});
            }
        } else {
            setReceiptForSale(receipt);
            setIsSaleDialogOpen(true);
        }
    };
    
    const handleSaleComplete = async (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => {
        try {
            await inventoryContext.recordSaleWithReceipt(receiptData, salesData);
            toast({
                title: "Penjualan Berhasil Dicatat",
                description: `Penjualan untuk resi ${receiptData.awb} telah disimpan.`,
            });
            setIsSaleDialogOpen(false);
            setReceiptForSale(null);
            await loadReceipts();
        } catch (error: any) {
            toast({
                title: "Gagal Mencatat Penjualan",
                description: error.message || "Terjadi kesalahan saat menyimpan data penjualan.",
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        language, t, router, receipts, totalReceipts, loading, awb, setAwb, isSubmitting,
        awbInputRef, currentPage, setCurrentPage, itemsPerPage, searchTerm, setSearchTerm,
        selectedDate, setSelectedDate, detailItems, isDetailOpen, setIsDetailOpen, receiptForSale,
        setReceiptForSale, isSaleDialogOpen, setIsSaleDialogOpen, salesChannel, shippingChannel,
        handleAwbSubmit, handleViewDetails, handleSaleComplete, totalPages: Math.ceil(totalReceipts / itemsPerPage)
    };
}

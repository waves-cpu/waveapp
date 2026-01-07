

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, ChannelPrice, Accessory, ShippingReceipt, BulkImportHistory, User, ReturnedItem, DiscountGroup, DiscountedProduct, PrintedReceiptCount } from '@/types';
import { categories as allCategories } from '@/types';
import { useToast } from './use-toast';
import { apiFetch } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => Promise<void>;
  bulkAddProducts: (products: any[], fileName: string) => Promise<{ addedCount: number, skippedCount: number, addedSkus: any[], skippedSkus: any[] }>;
  bulkUpdateProducts: (products: any[]) => Promise<{ updatedCount: number; notFoundSkus: string[] }>;
  updateItem: (itemId: string, itemData: any) => Promise<void>;
  updateStock: (itemId: string, change: number, reason: string) => Promise<void>;
  getItem: (itemId: string) => InventoryItem | undefined;
  getHistory: (itemId: string) => Promise<AdjustmentHistory[]>;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[], reason: string) => Promise<void>;
  fetchItems: () => Promise<void>;
  loading: boolean;
  recordSale: (channel: string, quantity: number, options: any) => Promise<any>;
  recordSaleWithReceipt: (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => Promise<void>;
  fetchSales: (channel: string, date: Date, page: number, limit: number) => Promise<{sales: Sale[], total: number}>;
  cancelSaleTransaction: (transactionId: string) => Promise<void>;
  returnSaleTransaction: (transactionId: string, items?: ReturnedItem[]) => Promise<void>;
  revertSaleItem: (transactionId: string, sku: string) => Promise<void>;
  findProductBySku: (sku: string) => Promise<InventoryItem | null>;
  allSales: Sale[];
  resellers: Reseller[];
  addReseller: (name: string, phone?: string, address?: string) => Promise<void>;
  editReseller: (id: number, data: Omit<Reseller, 'id'>) => Promise<void>;
  deleteReseller: (id: number) => Promise<void>;
  fetchResellers: () => Promise<void>;
  archiveProduct: (itemId: string, isArchived: boolean) => Promise<void>;
  deleteProductPermanently: (itemId: string) => Promise<void>;
  // Accessories
  accessories: Accessory[];
  addAccessory: (accessory: Omit<Accessory, 'id' | 'history'>) => Promise<void>;
  updateAccessory: (accessoryId: string, accessoryData: Omit<Accessory, 'id' | 'history'>) => Promise<void>;
  adjustAccessoryStock: (accessoryId: string, change: number, reason: string) => Promise<void>;
  // Shipping
  allShippingReceipts: ShippingReceipt[];
  fetchShippingReceipts: (options: { page: number; limit: number; salesChannel?: string; channel?: string; dateString?: string; date_range?: { from: Date; to: Date }; status?: string[]; awb?: string; }) => Promise<{ receipts: ShippingReceipt[]; total: number; }>;
  findShippingReceiptByAwb: (awb: string) => Promise<ShippingReceipt | null>;
  addShippingReceipt: (receipt: Omit<ShippingReceipt, 'id'>) => Promise<ShippingReceipt>;
  deleteShippingReceipt: (id: number) => Promise<void>;
  updateShippingReceiptsStatus: (ids: number[], status: string) => Promise<void>;
  updateShippingReceiptStatus: (id: number, status: string) => Promise<void>;
  fetchShippingReceiptCounts: (filters: { dateString?: string; salesChannel?: string; shippingChannel?: string; status?: string[]; }) => Promise<{ salesChannels: Record<string, Record<string, number>>; shippingChannels: Record<string, number>; statuses: Record<string, number>; shippingChannelsBySalesChannel: Record<string, Record<string, number>>; }>;
  getReceiptCountByStatus: (status: string) => Promise<Record<string, number>>;
  getPendingReceiptsBeforeDate: (date: Date) => Promise<number>;
  addPrintedReceipts: (date: string, salesChannel: string, shippingChannel: string, count: number) => Promise<void>;
  checkPrintedReceiptAvailability: (salesChannel: string, shippingChannel: string, date: string) => Promise<boolean>;
  getPrintedReceiptCountsForDate: (date: string) => Promise<PrintedReceiptCount[]>;
  // Bulk Import History
  fetchImportHistory: () => Promise<BulkImportHistory[]>;
  deleteImportHistory: (id: number) => Promise<void>;
  // POS
  clearPosTransactions: (date: Date) => Promise<void>;
  pendingTransaction: Sale[] | null;
  loadPendingTransaction: (sales: Sale[]) => void;
  clearPendingTransaction: () => void;
  // Discounts
  discountGroups: DiscountGroup[];
  fetchDiscountGroups: () => Promise<void>;
  addDiscountGroup: (group: Omit<DiscountGroup, 'id' | 'productCount'>) => Promise<void>;
  editDiscountGroup: (id: number, group: Omit<DiscountGroup, 'id' | 'productCount'>) => Promise<void>;
  getDiscountGroup: (id: number) => Promise<DiscountGroup | null>;
  deleteDiscountGroup: (id: number) => Promise<void>;
  getActiveDiscountPrice: (productId: string | number, variantId: string | number | null, category: string, channel: string) => Promise<number | null>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: inventoryData, isLoading: isInventoryLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: () => apiFetch<{ products: InventoryItem[], accessories: Accessory[] }>('/api/products'),
    });

    const { data: allSales, isLoading: isSalesLoading } = useQuery({
        queryKey: ['sales'],
        queryFn: () => apiFetch<{ sales: Sale[] }>('/api/sales').then(res => res.sales),
    });

    const { data: resellers, isLoading: isResellersLoading } = useQuery({
        queryKey: ['resellers'],
        queryFn: () => apiFetch<Reseller[]>('/api/resellers'),
    });

    const { data: allShippingReceipts, isLoading: isReceiptsLoading } = useQuery({
        queryKey: ['shippingReceipts'],
        queryFn: () => apiFetch<{ receipts: ShippingReceipt[] }>('/api/shipping/receipts?limit=100000').then(res => res.receipts),
    });

    const { data: discountGroups, isLoading: isDiscountsLoading } = useQuery({
        queryKey: ['discountGroups'],
        queryFn: () => apiFetch<DiscountGroup[]>('/api/finance/discounts'),
    });
    
    const [pendingTransaction, setPendingTransaction] = useState<Sale[] | null>(null);
    useEffect(() => {
        const storedPending = sessionStorage.getItem('pendingTransaction');
        if (storedPending) {
            setPendingTransaction(JSON.parse(storedPending));
        }
    }, []);

    const loading = isInventoryLoading || isSalesLoading || isResellersLoading || isReceiptsLoading || isDiscountsLoading;

    const mutation = useMutation({
        onSuccess: (data, variables: any) => {
            // Invalidate all queries to refetch data after any mutation
            return queryClient.invalidateQueries();
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: error.message || 'An unexpected error occurred.',
            });
            throw error; // Re-throw to allow individual components to handle it
        },
    });

    const categories = useMemo(() => [...new Set((inventoryData?.products || []).map(item => item.category))].sort(), [inventoryData]);

    const findProductBySku = useCallback(async (sku: string): Promise<InventoryItem | null> => {
        const items = inventoryData?.products || [];
        const lowerSku = sku.toLowerCase();
        for (const item of items) {
            if (item.variants?.length) {
                for (const variant of item.variants) {
                    if (variant.sku?.toLowerCase() === lowerSku) return { ...item, variants: [variant] };
                }
            }
            if (item.sku?.toLowerCase() === lowerSku) return item;
        }
        const productByName = items.find(item => item.name.toLowerCase() === lowerSku);
        return productByName || null;
    }, [inventoryData]);
    
    const loadPendingTransaction = (sales: Sale[]) => {
      sessionStorage.setItem('pendingTransaction', JSON.stringify(sales));
      setPendingTransaction(sales);
    };
  
    const clearPendingTransaction = () => {
        sessionStorage.removeItem('pendingTransaction');
        setPendingTransaction(null);
    };

    const mutationWrapper = (mutationFn: (vars: any) => Promise<any>, invalidateKeys: string[][] = []) => {
        return useMutation({
            mutationFn,
            onSuccess: () => {
                const keysToInvalidate = [['inventory'], ['sales'], ['resellers'], ['shippingReceipts'], ['discountGroups'], ...invalidateKeys];
                keysToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
            },
            onError: (error: any) => {
                toast({
                    variant: 'destructive',
                    title: 'Operation Failed',
                    description: error.message || 'An unexpected error occurred.',
                });
                throw error;
            }
        });
    };

    const addReseller = mutationWrapper((vars: { name: string, phone?: string, address?: string }) => apiFetch('/api/resellers', { method: 'POST', body: vars }));
    const editReseller = mutationWrapper((vars: { id: number, data: Omit<Reseller, 'id'> }) => apiFetch(`/api/resellers/${vars.id}`, { method: 'PUT', body: vars.data }));
    const deleteReseller = mutationWrapper((id: number) => apiFetch(`/api/resellers/${id}`, { method: 'DELETE' }));
    
    const addItem = mutationWrapper((itemData: any) => apiFetch('/api/products', { method: 'POST', body: itemData }));
    const bulkAddProducts = mutationWrapper((vars: { products: any[], fileName: string }) => apiFetch('/api/products/bulk-add', { method: 'POST', body: vars }));
    const bulkUpdateProducts = mutationWrapper((vars: { products: any[] }) => apiFetch('/api/products/bulk-update', { method: 'POST', body: vars }));
    const updateItem = mutationWrapper((vars: { itemId: string, itemData: any }) => apiFetch(`/api/products/${vars.itemId}`, { method: 'PUT', body: vars.itemData }));
    const bulkUpdateVariants = mutationWrapper((vars: { itemId: string, variants: InventoryItemVariant[], reason: string }) => apiFetch(`/api/products/${vars.itemId}/variants-bulk-update`, { method: 'POST', body: { variants: vars.variants, reason: vars.reason } }));
    
    const updateStock = mutationWrapper((vars: { itemId: string, change: number, reason: string }) => apiFetch(`/api/products/${vars.itemId}/stock`, { method: 'POST', body: vars }));
    const archiveProduct = mutationWrapper((vars: { itemId: string, isArchived: boolean }) => apiFetch(`/api/products/${vars.itemId}`, { method: 'PUT', body: { isArchived: vars.isArchived } }));
    const deleteProductPermanently = mutationWrapper((itemId: string) => apiFetch(`/api/products/${itemId}`, { method: 'DELETE' }));

    const addAccessory = mutationWrapper((accessory: Omit<Accessory, 'id' | 'history'>) => apiFetch('/api/products', { method: 'POST', body: { ...accessory, type: 'accessory' } }));
    const updateAccessory = mutationWrapper((vars: { accessoryId: string, accessoryData: any }) => apiFetch(`/api/products/${vars.accessoryId}`, { method: 'PUT', body: { ...vars.accessoryData, type: 'accessory' } }));
    const adjustAccessoryStock = mutationWrapper((vars: { accessoryId: string, change: number, reason: string }) => apiFetch(`/api/products/${vars.accessoryId}/stock`, { method: 'POST', body: { ...vars, type: 'accessory' } }));
    
    const recordSale = mutationWrapper((vars: any) => apiFetch('/api/sales', { method: 'POST', body: vars }));
    const recordSaleWithReceipt = mutationWrapper((vars: any) => apiFetch('/api/sales/online', { method: 'POST', body: vars }));
    const cancelSaleTransaction = mutationWrapper((transactionId: string) => apiFetch(`/api/sales/transaction/${transactionId}`, { method: 'DELETE' }));
    const returnSaleTransaction = mutationWrapper((vars: { transactionId: string, items?: ReturnedItem[] }) => apiFetch(`/api/sales/transaction/${vars.transactionId}/return`, { method: 'POST', body: { items: vars.items || [] } }));
    const revertSaleItem = mutationWrapper((vars: { transactionId: string, sku: string }) => apiFetch(`/api/sales/transaction/${vars.transactionId}/revert`, { method: 'POST', body: { sku: vars.sku } }));
    const clearPosTransactions = mutationWrapper((date: Date) => apiFetch(`/api/sales/pos-history?date=${date.toISOString()}`, { method: 'DELETE' }));
    
    const addShippingReceipt = mutationWrapper((receipt: Omit<ShippingReceipt, 'id'>) => apiFetch('/api/shipping/receipts', { method: 'POST', body: receipt }));
    const deleteShippingReceipt = mutationWrapper((id: number) => apiFetch(`/api/shipping/receipts/${id}`, { method: 'DELETE' }));
    const updateShippingReceiptsStatus = mutationWrapper((vars: { ids: number[], status: string }) => apiFetch('/api/shipping/receipts/status', { method: 'PUT', body: vars }));
    const updateShippingReceiptStatus = mutationWrapper((vars: { id: number, status: string }) => apiFetch(`/api/shipping/receipts/${vars.id}`, { method: 'PUT', body: { status: vars.status } }));
    const addPrintedReceipts = mutationWrapper((vars: { date: string, salesChannel: string, shippingChannel: string, count: number }) => apiFetch('/api/shipping/printed-receipts', { method: 'POST', body: vars }));
    
    const deleteImportHistory = mutationWrapper((id: number) => apiFetch(`/api/products/bulk-add/${id}`, { method: 'DELETE' }), [['bulkImportHistory']]);
    
    const addDiscountGroup = mutationWrapper((group: any) => apiFetch('/api/finance/discounts', { method: 'POST', body: group }));
    const editDiscountGroup = mutationWrapper((vars: { id: number, group: any }) => apiFetch(`/api/finance/discounts/${vars.id}`, { method: 'PUT', body: vars.group }));
    const deleteDiscountGroup = mutationWrapper((id: number) => apiFetch(`/api/finance/discounts/${id}`, { method: 'DELETE' }));
    
  return (
    <InventoryContext.Provider value={{ 
        items: inventoryData?.products || [],
        accessories: inventoryData?.accessories || [],
        allSales: allSales || [],
        resellers: resellers || [],
        allShippingReceipts: allShippingReceipts || [],
        discountGroups: discountGroups || [],
        loading,
        categories,
        pendingTransaction, loadPendingTransaction, clearPendingTransaction, findProductBySku,
        fetchItems: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        // Mutations
        addItem: (vars: any) => addItem.mutateAsync(vars),
        bulkAddProducts: (products: any[], fileName: string) => bulkAddProducts.mutateAsync({ products, fileName }),
        bulkUpdateProducts: (products: any[]) => bulkUpdateProducts.mutateAsync({ products }),
        updateItem: (itemId: string, itemData: any) => updateItem.mutateAsync({ itemId, itemData }),
        updateStock: (itemId: string, change: number, reason: string) => updateStock.mutateAsync({ itemId, change, reason }),
        bulkUpdateVariants: (itemId: string, variants: any[], reason: string) => bulkUpdateVariants.mutateAsync({ itemId, variants, reason }),
        recordSale: (channel: string, quantity: number, options: any) => recordSale.mutateAsync({ sales: options.sales, options: { ...options, channel } }),
        recordSaleWithReceipt: (receiptData: any, salesData: any) => recordSaleWithReceipt.mutateAsync({ receipt: receiptData, sales: salesData }),
        cancelSaleTransaction: (id: string) => cancelSaleTransaction.mutateAsync(id),
        returnSaleTransaction: (id: string, items?: ReturnedItem[]) => returnSaleTransaction.mutateAsync({ transactionId: id, items }),
        revertSaleItem: (id: string, sku: string) => revertSaleItem.mutateAsync({ transactionId: id, sku }),
        addReseller: (name: string, phone?: string, address?: string) => addReseller.mutateAsync({ name, phone, address }),
        editReseller: (id: number, data: any) => editReseller.mutateAsync({ id, data }),
        deleteReseller: (id: number) => deleteReseller.mutateAsync(id),
        fetchResellers: () => queryClient.invalidateQueries({ queryKey: ['resellers'] }),
        archiveProduct: (itemId: string, isArchived: boolean) => archiveProduct.mutateAsync({ itemId, isArchived }),
        deleteProductPermanently: (id: string) => deleteProductPermanently.mutateAsync(id),
        addAccessory: (accessory: any) => addAccessory.mutateAsync(accessory),
        updateAccessory: (accessoryId: string, accessoryData: any) => updateAccessory.mutateAsync({ accessoryId, accessoryData }),
        adjustAccessoryStock: (accessoryId: string, change: number, reason: string) => adjustAccessoryStock.mutateAsync({ accessoryId, change, reason }),
        addShippingReceipt: (receipt: any) => addShippingReceipt.mutateAsync(receipt),
        deleteShippingReceipt: (id: number) => deleteShippingReceipt.mutateAsync(id),
        updateShippingReceiptsStatus: (ids: number[], status: string) => updateShippingReceiptsStatus.mutateAsync({ ids, status }),
        updateShippingReceiptStatus: (id: number, status: string) => updateShippingReceiptStatus.mutateAsync({ id, status }),
        addPrintedReceipts: (date: string, salesChannel: string, shippingChannel: string, count: number) => addPrintedReceipts.mutateAsync({ date, salesChannel, shippingChannel, count }),
        deleteImportHistory: (id: number) => deleteImportHistory.mutateAsync(id),
        clearPosTransactions: (date: Date) => clearPosTransactions.mutateAsync(date),
        addDiscountGroup: (group: any) => addDiscountGroup.mutateAsync(group),
        editDiscountGroup: (id: number, group: any) => editDiscountGroup.mutateAsync({ id, group }),
        deleteDiscountGroup: (id: number) => deleteDiscountGroup.mutateAsync(id),
        
        // Functions that don't mutate but fetch data can remain as they are
        getHistory: async (itemId: string) => (inventoryData?.products.find(i => i.id === itemId)?.history || []),
        getItem: useCallback((itemId: string) => (inventoryData?.products || []).find(i => i.id === itemId), [inventoryData]),
        fetchSales: async (channel: string, date: Date, page: number, limit: number) => {
            const dateString = date.toISOString().split('T')[0];
            const url = `/api/sales?channel=${channel}&startDate=${dateString}&endDate=${dateString}&page=${page}&limit=${limit}`;
            const result = await apiFetch(url);
            return { sales: result.sales, total: result.total };
        },
        findShippingReceiptByAwb: async (awb: string) => (await apiFetch(`/api/shipping/receipts?awb=${awb}`)).receipts?.[0] || null,
        fetchShippingReceipts: async (options) => apiFetch(`/api/shipping/receipts?${new URLSearchParams(options as any).toString()}`),
        fetchShippingReceiptCounts: async (filters) => apiFetch(`/api/shipping/receipts/counts?${new URLSearchParams(filters as any).toString()}`),
        getReceiptCountByStatus: async (status: string) => apiFetch(`/api/shipping/receipts/counts?status=${status}`),
        getPendingReceiptsBeforeDate: async (date: Date) => (await apiFetch(`/api/shipping/receipts/pending-count?before=${date.toISOString()}`)).count,
        getPrintedReceiptCountsForDate: async (date: string) => apiFetch(`/api/shipping/printed-receipts?date=${date}`),
        checkPrintedReceiptAvailability: async (salesChannel: string, shippingChannel: string, date: string) => (await apiFetch('/api/shipping/printed-receipts/check', { method: 'POST', body: { salesChannel, shippingChannel, date } })).isAvailable,
        fetchImportHistory: async () => apiFetch('/api/products/bulk-add'),
        fetchDiscountGroups: () => queryClient.invalidateQueries({queryKey: ['discountGroups']}),
        getDiscountGroup: async (id: number) => apiFetch(`/api/finance/discounts/${id}`),
        getActiveDiscountPrice: async (productId, variantId, category, channel) => (await apiFetch('/api/finance/discounts/get-active-price', { method: 'POST', body: { productId, variantId, category, channel } })).price,
      }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};


'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Accessory, ShippingReceipt, BulkImportHistory, User, ReturnedItem, DiscountGroup, DiscountedProduct, PrintedReceiptCount, ShippingReceiptCounts, Reseller, Employee } from '@/types';
import { categories as allCategories } from '@/types';
import { useToast } from './use-toast';
import { apiFetch } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';


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
  recordSale: (channel: string, options: any) => Promise<any>;
  recordSaleWithReceipt: (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => Promise<void>;
  fetchSales: (channel: string, date: Date, page: number, limit: number) => Promise<{sales: Sale[], total: number}>;
  cancelSaleTransaction: (transactionId: string) => Promise<void>;
  returnSaleTransaction: (transactionId: string, items?: ReturnedItem[]) => Promise<void>;
  revertSaleItem: (transactionId: string, sku: string) => Promise<void>;
  findProductBySku: (sku: string) => Promise<InventoryItem | null>;
  allSales: Sale[];
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
  updateShippingReceiptsStatus: (ids: number[], status: string, userId?: number, username?: string) => Promise<void>;
  updateShippingReceiptStatus: (id: number, status: string, userId?: number, username?: string) => Promise<void>;
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
  // Resellers
  resellers: Reseller[];
  addReseller: (reseller: Omit<Reseller, 'id' | 'createdAt'>) => Promise<Reseller>;
  updateReseller: (id: number, reseller: Partial<Omit<Reseller, 'id' | 'createdAt'>>) => Promise<Reseller>;
  deleteReseller: (id: number) => Promise<void>;
  getResellerById: (id: number) => Promise<Reseller | null>;
  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'userId' | 'username' | 'role'> & { username: string, password?: string }) => Promise<Employee>;
  updateEmployee: (id: number, employee: Partial<Omit<Employee, 'id'| 'userId' | 'username' | 'role'>>) => Promise<Employee>;
  deleteEmployee: (id: number) => Promise<void>;
  updateUserPassword: (userId: number, newPassword: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    const { data: inventoryData, isLoading: isInventoryLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: () => apiFetch<{ products: InventoryItem[], accessories: Accessory[] }>('/api/products'),
    });

    const { data: allSales, isLoading: isSalesLoading } = useQuery({
        queryKey: ['sales'],
        queryFn: () => apiFetch<{ sales: Sale[] }>('/api/sales').then(res => res.sales),
    });

    const { data: allShippingReceipts, isLoading: isReceiptsLoading } = useQuery({
        queryKey: ['shippingReceipts'],
        queryFn: () => apiFetch<{ receipts: ShippingReceipt[] }>('/api/shipping/receipts?limit=100000').then(res => res.receipts),
    });

    const { data: discountGroups, isLoading: isDiscountsLoading } = useQuery({
        queryKey: ['discountGroups'],
        queryFn: () => apiFetch<DiscountGroup[]>('/api/finance/discounts'),
    });
    
    const { data: resellers, isLoading: isResellersLoading } = useQuery<Reseller[]>({
        queryKey: ['resellers'],
        queryFn: () => apiFetch('/api/resellers'),
    });

    const { data: employees, isLoading: isEmployeesLoading } = useQuery<Employee[]>({
        queryKey: ['employees'],
        queryFn: () => apiFetch('/api/employees'),
    });

    const [pendingTransaction, setPendingTransaction] = useState<Sale[] | null>(null);
    useEffect(() => {
        const storedPending = sessionStorage.getItem('pendingTransaction');
        if (storedPending) {
            setPendingTransaction(JSON.parse(storedPending));
        }
    }, []);

    const loading = isInventoryLoading || isSalesLoading || isReceiptsLoading || isDiscountsLoading || isResellersLoading || isEmployeesLoading;

    const useApiMutation = <TData, TVariables>(
        mutationFn: (variables: TVariables) => Promise<TData>,
        options: {
            toastSuccessMessage?: string;
            toastErrorMessage?: string;
            invalidateQueries?: (string | number)[][];
        } = {}
    ) => {
        return useMutation<TData, Error, TVariables>({
            mutationFn,
            onSuccess: () => {
                const keysToInvalidate: (string | number)[][] = [
                    ['inventory'], ['sales'], 
                    ['shippingReceipts'], ['discountGroups'], ['resellers'], ['employees'],
                    ...(options.invalidateQueries || [])
                ];
                keysToInvalidate.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
                
                if (options.toastSuccessMessage) {
                    toast({ title: 'Success', description: options.toastSuccessMessage });
                }
            },
            onError: (error: any) => {
                toast({
                    variant: 'destructive',
                    title: options.toastErrorMessage || 'Operation Failed',
                    description: error.message || 'An unexpected error occurred.',
                });
                throw error;
            }
        });
    };

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

    const addItemMutation = useApiMutation((itemData: any) => apiFetch('/api/products', { method: 'POST', body: itemData }));
    const bulkAddProductsMutation = useApiMutation((vars: { products: any[], fileName: string }) => apiFetch('/api/products/bulk-add', { method: 'POST', body: vars }));
    const bulkUpdateProductsMutation = useApiMutation((vars: { products: any[] }) => apiFetch('/api/products/bulk-update', { method: 'POST', body: vars }));
    const updateItemMutation = useApiMutation((vars: { itemId: string, itemData: any }) => apiFetch(`/api/products/${vars.itemId}`, { method: 'PUT', body: vars.itemData }));
    const bulkUpdateVariantsMutation = useApiMutation((vars: { itemId: string, variants: InventoryItemVariant[], reason: string }) => apiFetch(`/api/products/${vars.itemId}/variants-bulk-update`, { method: 'POST', body: { variants: vars.variants, reason: vars.reason } }));
    const updateStockMutation = useApiMutation((vars: { itemId: string, change: number, reason: string }) => apiFetch(`/api/products/${vars.itemId}/stock`, { method: 'POST', body: {...vars, userId: user?.id, username: user?.username} }));
    const archiveProductMutation = useApiMutation((vars: { itemId: string, isArchived: boolean }) => apiFetch(`/api/products/${vars.itemId}`, { method: 'PUT', body: { isArchived: vars.isArchived } }));
    const deleteProductPermanentlyMutation = useApiMutation((itemId: string) => apiFetch(`/api/products/${itemId}`, { method: 'DELETE' }));
    const addAccessoryMutation = useApiMutation((accessory: Omit<Accessory, 'id' | 'history'>) => apiFetch('/api/products', { method: 'POST', body: { ...accessory, type: 'accessory' } }));
    const updateAccessoryMutation = useApiMutation((vars: { accessoryId: string, accessoryData: any }) => apiFetch(`/api/products/${vars.accessoryId}`, { method: 'PUT', body: { ...vars.accessoryData, type: 'accessory' } }));
    const adjustAccessoryStockMutation = useApiMutation((vars: { accessoryId: string, change: number, reason: string }) => apiFetch(`/api/products/${vars.accessoryId}/stock`, { method: 'POST', body: { ...vars, type: 'accessory', userId: user?.id, username: user?.username } }));
    const recordSaleMutation = useApiMutation((vars: any) => apiFetch('/api/sales', { method: 'POST', body: vars }));
    const recordSaleWithReceiptMutation = useApiMutation((vars: any) => apiFetch('/api/sales/online', { method: 'POST', body: { ...vars, userId: user?.id, username: user?.username } }));
    const cancelSaleTransactionMutation = useApiMutation((transactionId: string) => apiFetch(`/api/sales/transaction/${transactionId}`, { method: 'DELETE' }));
    const returnSaleTransactionMutation = useApiMutation((vars: { transactionId: string, items?: ReturnedItem[] }) => apiFetch(`/api/sales/transaction/${vars.transactionId}/return`, { method: 'POST', body: { items: vars.items || [] } }));
    const revertSaleItemMutation = useApiMutation((vars: { transactionId: string, sku: string }) => apiFetch(`/api/sales/transaction/${vars.transactionId}/revert`, { method: 'POST', body: { sku: vars.sku } }));
    const clearPosTransactionsMutation = useApiMutation((date: Date) => apiFetch(`/api/sales/pos-history?date=${date.toISOString()}`, { method: 'DELETE' }));
    const addShippingReceiptMutation = useApiMutation((receipt: Omit<ShippingReceipt, 'id'>) => apiFetch('/api/shipping/receipts', { method: 'POST', body: receipt }));
    const deleteShippingReceiptMutation = useApiMutation((id: number) => apiFetch(`/api/shipping/receipts/${id}`, { method: 'DELETE' }));
    const updateShippingReceiptsStatusMutation = useApiMutation((vars: { ids: number[], status: string, userId?: number, username?: string }) => apiFetch('/api/shipping/receipts/status', { method: 'PUT', body: vars }));
    const updateShippingReceiptStatusMutation = useApiMutation((vars: { id: number, status: string, userId?: number, username?: string }) => apiFetch(`/api/shipping/receipts/${vars.id}`, { method: 'PUT', body: { status: vars.status, userId: vars.userId, username: vars.username } }));
    const addPrintedReceiptsMutation = useApiMutation((vars: { date: string, salesChannel: string, shippingChannel: string, count: number }) => apiFetch('/api/shipping/printed-receipts', { method: 'POST', body: vars }));
    const deleteImportHistoryMutation = useApiMutation((id: number) => apiFetch(`/api/products/bulk-add/${id}`, { method: 'DELETE' }), { invalidateQueries: [['bulkImportHistory']] });
    const addDiscountGroupMutation = useApiMutation((group: any) => apiFetch('/api/finance/discounts', { method: 'POST', body: group }));
    const editDiscountGroupMutation = useApiMutation((vars: { id: number, group: any }) => apiFetch(`/api/finance/discounts/${vars.id}`, { method: 'PUT', body: vars.group }));
    const deleteDiscountGroupMutation = useApiMutation((id: number) => apiFetch(`/api/finance/discounts/${id}`, { method: 'DELETE' }));
    const addResellerMutation = useApiMutation((reseller: any) => apiFetch('/api/resellers', { method: 'POST', body: reseller }));
    const updateResellerMutation = useApiMutation((vars: { id: number, reseller: any }) => apiFetch(`/api/resellers/${vars.id}`, { method: 'PUT', body: vars.reseller }));
    const deleteResellerMutation = useApiMutation((id: number) => apiFetch(`/api/resellers/${id}`, { method: 'DELETE' }));
    const addEmployeeMutation = useApiMutation((employee: Parameters<InventoryContextType['addEmployee']>[0]) => apiFetch('/api/employees', { method: 'POST', body: employee }));
    const updateEmployeeMutation = useApiMutation((vars: { id: number, employee: Parameters<InventoryContextType['updateEmployee']>[1] }) => apiFetch(`/api/employees/${vars.id}`, { method: 'PUT', body: vars.employee }));
    const deleteEmployeeMutation = useApiMutation((id: number) => apiFetch(`/api/employees/${id}`, { method: 'DELETE' }));
    const updateUserPasswordMutation = useApiMutation((vars: {userId: number, newPassword: string}) => apiFetch(`/api/users/${vars.userId}/password`, {method: 'PUT', body: {password: vars.newPassword}}));


    const getHistory = useCallback(async (itemId: string) => (inventoryData?.products.find(i => i.id === itemId)?.history || []), [inventoryData]);
    const getItem = useCallback((itemId: string) => (inventoryData?.products || []).find(i => i.id === itemId), [inventoryData]);
    const fetchItems = useCallback(() => queryClient.invalidateQueries({ queryKey: ['inventory'] }), [queryClient]);
    const fetchSales = useCallback(async (channel: string, date: Date, page: number, limit: number) => {
        const dateString = date.toISOString().split('T')[0];
        const url = `/api/sales?channel=${channel}&startDate=${dateString}&endDate=${dateString}&page=${page}&limit=${limit}`;
        const result = await apiFetch(url);
        return { sales: result.sales, total: result.total };
    }, []);
    const findShippingReceiptByAwb = useCallback(async (awb: string) => (await apiFetch(`/api/shipping/receipts?awb=${awb}`)).receipts?.[0] || null, []);
    const fetchShippingReceipts = useCallback(async (options: any) => apiFetch(`/api/shipping/receipts?${new URLSearchParams(options as any).toString()}`), []);
    const fetchShippingReceiptCounts = useCallback(async (filters: any) => apiFetch(`/api/shipping/receipts/counts?${new URLSearchParams(filters as any).toString()}`), []);
    const getReceiptCountByStatus = useCallback(async (status: string) => apiFetch(`/api/shipping/receipts/counts?status=${status}`), []);
    const getPendingReceiptsBeforeDate = useCallback(async (date: Date) => (await apiFetch(`/api/shipping/receipts/pending-count?before=${date.toISOString()}`)).count, []);
    const getPrintedReceiptCountsForDate = useCallback(async (date: string) => apiFetch(`/api/shipping/printed-receipts?date=${date}`), []);
    const checkPrintedReceiptAvailability = useCallback(async (salesChannel: string, shippingChannel: string, date: string) => (await apiFetch('/api/shipping/printed-receipts/check', { method: 'POST', body: { salesChannel, shippingChannel, date } })).isAvailable, []);
    const fetchImportHistory = useCallback(async () => apiFetch('/api/products/bulk-add'), []);
    const fetchDiscountGroups = useCallback(() => queryClient.invalidateQueries({ queryKey: ['discountGroups'] }), [queryClient]);
    const getDiscountGroup = useCallback(async (id: number) => apiFetch(`/api/finance/discounts/${id}`), []);
    const getActiveDiscountPrice = useCallback(async (productId: any, variantId: any, category: any, channel: any) => (await apiFetch('/api/finance/discounts/get-active-price', { method: 'POST', body: { productId, variantId, category, channel } })).price, []);
    const getResellerById = useCallback(async (id: number) => apiFetch(`/api/resellers/${id}`), []);

  return (
    <InventoryContext.Provider value={{ 
        items: inventoryData?.products || [],
        accessories: inventoryData?.accessories || [],
        allSales: allSales || [],
        allShippingReceipts: allShippingReceipts || [],
        discountGroups: discountGroups || [],
        resellers: resellers || [],
        employees: employees || [],
        loading,
        categories,
        pendingTransaction, loadPendingTransaction, clearPendingTransaction, findProductBySku,
        fetchItems,
        // Mutations
        addItem: (vars: any) => addItemMutation.mutateAsync(vars),
        bulkAddProducts: (products: any[], fileName: string) => bulkAddProductsMutation.mutateAsync({ products, fileName }),
        bulkUpdateProducts: (products: any[]) => bulkUpdateProductsMutation.mutateAsync({ products }),
        updateItem: (itemId: string, itemData: any) => updateItemMutation.mutateAsync({ itemId, itemData }),
        bulkUpdateVariants: (itemId: string, variants: any[], reason: string) => bulkUpdateVariantsMutation.mutateAsync({ itemId, variants, reason }),
        updateStock: (itemId: string, change: number, reason: string) => updateStockMutation.mutateAsync({ itemId, change, reason }),
        archiveProduct: (itemId: string, isArchived: boolean) => archiveProductMutation.mutateAsync({ itemId, isArchived }),
        deleteProductPermanently: (id: string) => deleteProductPermanentlyMutation.mutateAsync(id),
        addAccessory: (accessory: any) => addAccessoryMutation.mutateAsync(accessory),
        updateAccessory: (accessoryId: string, accessoryData: any) => updateAccessoryMutation.mutateAsync({ accessoryId, accessoryData }),
        adjustAccessoryStock: (accessoryId: string, change: number, reason: string) => adjustAccessoryStockMutation.mutateAsync({ accessoryId, change, reason }),
        recordSale: (channel: string, options: any) => recordSaleMutation.mutateAsync({ sales: options.sales, options: { ...options, channel } }),
        recordSaleWithReceipt: (receiptData: any, salesData: any) => recordSaleWithReceiptMutation.mutateAsync({ receipt: receiptData, sales: salesData }),
        cancelSaleTransaction: (id: string) => cancelSaleTransactionMutation.mutateAsync(id),
        returnSaleTransaction: (id: string, items?: ReturnedItem[]) => returnSaleTransactionMutation.mutateAsync({ transactionId: id, items }),
        revertSaleItem: (id: string, sku: string) => revertSaleItemMutation.mutateAsync({ transactionId: id, sku }),
        clearPosTransactions: (date: Date) => clearPosTransactionsMutation.mutateAsync(date),
        addShippingReceipt: (receipt: any) => addShippingReceiptMutation.mutateAsync(receipt),
        deleteShippingReceipt: (id: number) => deleteShippingReceiptMutation.mutateAsync(id),
        updateShippingReceiptsStatus: (ids: number[], status: string, userId?: number, username?: string) => updateShippingReceiptsStatusMutation.mutateAsync({ ids, status, userId, username }),
        updateShippingReceiptStatus: (id: number, status: string, userId?: number, username?: string) => updateShippingReceiptStatusMutation.mutateAsync({ id, status, userId, username }),
        addPrintedReceipts: (date: string, salesChannel: string, shippingChannel: string, count: number) => addPrintedReceiptsMutation.mutateAsync({ date, salesChannel, shippingChannel, count }),
        deleteImportHistory: (id: number) => deleteImportHistoryMutation.mutateAsync(id),
        addDiscountGroup: (group: any) => addDiscountGroupMutation.mutateAsync(group),
        editDiscountGroup: (id: number, group: any) => editDiscountGroupMutation.mutateAsync({ id, group }),
        deleteDiscountGroup: (id: number) => deleteDiscountGroupMutation.mutateAsync(id),
        addReseller: (reseller: any) => addResellerMutation.mutateAsync(reseller),
        updateReseller: (id: number, reseller: any) => updateResellerMutation.mutateAsync({ id, reseller }),
        deleteReseller: (id: number) => deleteResellerMutation.mutateAsync(id),
        addEmployee: (employee: any) => addEmployeeMutation.mutateAsync(employee),
        updateEmployee: (id: number, employee: any) => updateEmployeeMutation.mutateAsync({ id, employee }),
        deleteEmployee: (id: number) => deleteEmployeeMutation.mutateAsync(id),
        updateUserPassword: (userId: number, newPassword: string) => updateUserPasswordMutation.mutateAsync({userId, newPassword}),
        getResellerById,
        // Memoized functions
        getHistory,
        getItem,
        fetchSales,
        findShippingReceiptByAwb,
        fetchShippingReceipts,
        fetchShippingReceiptCounts,
        getReceiptCountByStatus,
        getPendingReceiptsBeforeDate,
        getPrintedReceiptCountsForDate,
        checkPrintedReceiptAvailability,
        fetchImportHistory,
        fetchDiscountGroups,
        getDiscountGroup,
        getActiveDiscountPrice,
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

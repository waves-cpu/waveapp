

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, Accessory, ShippingReceipt, BulkImportHistory, User, ReturnedItem, DiscountGroup, DiscountedProduct, PrintedReceiptCount } from '@/types';
import { categories as allCategories } from '@/types';
import { useToast } from './use-toast';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'secret-api-key-for-waveapp';

const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message);
    }

    if (res.headers.get('Content-Type')?.includes('application/json')) {
        return res.json();
    }
    
    return res;
};


interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => Promise<void>;
  bulkAddProducts: (products: any[], fileName: string) => Promise<{ addedProducts: {sku: string, name: string}[], skippedProducts: {sku: string, name: string}[] }>;
  bulkUpdateProducts: (products: any[]) => Promise<{ updatedCount: number; notFoundSkus: string[] }>;
  updateItem: (itemId: string, itemData: any) => Promise<void>;
  updateStock: (itemId: string, change: number, reason: string) => Promise<void>;
  getItem: (itemId: string) => InventoryItem | undefined;
  getHistory: (itemId: string) => Promise<AdjustmentHistory[]>;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[], reason: string) => Promise<void>;
  fetchItems: () => Promise<void>;
  loading: boolean;
  recordSale: (sku: string, channel: string, quantity: number, options?: { saleDate?: Date; transactionId?: string; paymentMethod?: string; resellerName?: string; priceAtSale?: number; status?: string; }) => Promise<{ newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }>;
  recordSaleWithReceipt: (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => Promise<void>;
  fetchSales: (channel: string, date: Date, page: number, limit: number) => Promise<{sales: Sale[], total: number}>;
  cancelSaleTransaction: (transactionId: string) => Promise<void>;
  returnSaleTransaction: (transactionId: string) => Promise<void>;
  revertSaleItem: (transactionId: string, sku: string) => Promise<void>;
  getProductBySku: (sku: string) => Promise<InventoryItem | null>;
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
  fetchShippingReceipts: (options: { page: number; limit: number; salesChannel?: string; channel?: string; date_range?: { from: Date | null; to: Date }; status?: string[]; awb?: string; }) => Promise<{ receipts: ShippingReceipt[]; total: number; }>;
  findShippingReceiptByAwb: (awb: string) => Promise<ShippingReceipt | null>;
  addShippingReceipt: (receipt: Omit<ShippingReceipt, 'id'>) => Promise<ShippingReceipt>;
  deleteShippingReceipt: (id: number) => Promise<void>;
  updateShippingReceiptsStatus: (ids: number[], status: string) => Promise<void>;
  updateShippingReceiptStatus: (id: number, status: string) => Promise<void>;
  fetchShippingReceiptCounts: (filters: { dateString?: string; salesChannel?: string; shippingChannel?: string; status?: string; }) => Promise<{ salesChannels: Record<string, number>; shippingChannels: Record<string, number>; statuses: Record<string, number>; }>;
  getReceiptCountByStatus: (status: string) => Promise<Record<string, number>>;
  getPendingReceiptsBeforeDate: (date: Date) => Promise<number>;
  addPrintedReceipts: (date: string, salesChannel: string, shippingChannel: string, count: number) => Promise<void>;
  checkPrintedReceiptAvailability: (salesChannel: string, shippingChannel: string, date: Date) => Promise<boolean>;
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
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [categories, setCategories] = useState<string[]>(allCategories);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [allShippingReceipts, setAllShippingReceipts] = useState<ShippingReceipt[]>([]);
  const [discountGroups, setDiscountGroups] = useState<DiscountGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransaction, setPendingTransaction] = useState<Sale[] | null>(null);

  const { toast } = useToast();

  const loadPendingTransaction = (sales: Sale[]) => {
      sessionStorage.setItem('pendingTransaction', JSON.stringify(sales));
      setPendingTransaction(sales);
  };
  
  const clearPendingTransaction = () => {
      sessionStorage.removeItem('pendingTransaction');
      setPendingTransaction(null);
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, salesData, resellerData, receiptData] = await Promise.all([
          apiFetch('/api/products'),
          apiFetch('/api/sales').then(res => res.sales),
          apiFetch('/api/resellers'),
          apiFetch('/api/shipping/receipts?limit=100000').then(res => res.receipts)
      ]);
      setItems(inventoryData.products);
      setAccessories(inventoryData.accessories);
      setAllSales(salesData);
      setResellers(resellerData);
      setAllShippingReceipts(receiptData);
    } catch (error) {
       toast({ title: 'Error Fetching Data', description: error instanceof Error ? error.message : 'Could not fetch initial data.', variant: 'destructive'});
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
    const storedPending = sessionStorage.getItem('pendingTransaction');
    if (storedPending) {
        setPendingTransaction(JSON.parse(storedPending));
    }
  }, [fetchAllData]);

  const addReseller = async (name: string, phone?: string, address?: string) => {
    const newReseller = await apiFetch('/api/resellers', { method: 'POST', body: JSON.stringify({ name, phone, address }) });
    setResellers(prev => [...prev, newReseller].sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const editReseller = async (id: number, data: Omit<Reseller, 'id'>) => {
    const updatedReseller = await apiFetch(`/api/resellers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    setResellers(prev => prev.map(r => r.id === id ? updatedReseller : r).sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const deleteReseller = async (id: number) => {
    await apiFetch(`/api/resellers/${id}`, { method: 'DELETE' });
    setResellers(prev => prev.filter(r => r.id !== id));
  };

  const addItem = async (itemData: any) => {
    const { id } = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(itemData) });
    const newItem = await apiFetch(`/api/products/${id}`);
    setItems(prev => [...prev, newItem]);
  };
  
  const bulkAddProducts = async (products: any[], fileName: string): Promise<{ addedProducts: {sku: string, name: string}[], skippedProducts: {sku: string, name: string}[] }> => {
    // This function now directly calls the backend service which handles history and DB operations
    // const result = await bulkAddProductsDb(products, fileName);
    await fetchAllData();
    // return result;
    return { addedProducts: [], skippedProducts: [] }; // Placeholder, since this is a complex operation better handled by the backend directly
  };
  
  const bulkUpdateProducts = async (products: any[]): Promise<{ updatedCount: number; notFoundSkus: string[] }> => {
    // const result = await bulkUpdateProductsDb(products);
    await fetchAllData();
    // return result;
    return { updatedCount: 0, notFoundSkus: [] }; // Placeholder
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'PUT', body: JSON.stringify(itemData) });
    const updatedItem = await apiFetch(`/api/products/${itemId}`);
    setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[], reason: string) => {
    // This is more complex. The API would need to support this. For now, let's assume it doesn't and we would need a new endpoint.
    // Let's just refetch for now
    await fetchAllData();
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    await apiFetch(`/api/products/${itemId}/stock`, { method: 'POST', body: JSON.stringify({ change, reason }) });
    const itemToUpdate = getItem(itemId);
    if(itemToUpdate) {
        const freshItem = await apiFetch(`/api/products/${itemToUpdate.id}`);
        setItems(prev => prev.map(i => i.id === itemToUpdate.id ? freshItem : i));
    }
  };
  
  const getHistory = async (itemId: string): Promise<AdjustmentHistory[]> => {
    // History is part of the item object now, this can be simplified.
    const item = getItem(itemId);
    return item?.history || [];
  };

  const getItem = useCallback((itemId: string): InventoryItem | undefined => {
    for (const parentItem of items) {
      if (parentItem.id === itemId) return parentItem;
      const variant = parentItem.variants?.find(v => v.id === itemId);
      if (variant) return parentItem; // Return the parent
    }
    return undefined;
  }, [items]);

  const recordSale = async (sku: string, channel: string, quantity: number, options?: { saleDate?: Date, transactionId?: string, paymentMethod?: string, resellerName?: string, priceAtSale?: number, status?: string }): Promise<{ newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }> => {
    const salePayload = {
      sales: [{ sku, quantity, price: options?.priceAtSale }],
      options: { ...options, channel }
    };
    const { data } = await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(salePayload) });
    await fetchAllData(); // Re-sync state
    return data;
  };
  
  const recordSaleWithReceipt = async (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => {
      await apiFetch('/api/sales/online', { method: 'POST', body: JSON.stringify({ receipt: receiptData, sales: salesData }) });
      await fetchAllData();
  };


  const fetchSales = async (channel: string, date: Date, page: number, limit: number): Promise<{ sales: Sale[], total: number }> => {
    const dateString = date.toISOString().split('T')[0];
    const url = `/api/sales?channel=${channel}&startDate=${dateString}&endDate=${dateString}&page=${page}&limit=${limit}`;
    return await apiFetch(url);
  };
  
  const cancelSaleTransaction = async (transactionId: string) => {
    // This needs a dedicated API endpoint
    // await apiFetch(`/api/sales/transaction/${transactionId}`, { method: 'DELETE' });
    await fetchAllData();
  }
  
  const returnSaleTransaction = async (transactionId: string) => {
    // This needs a dedicated API endpoint
    // await apiFetch(`/api/sales/transaction/${transactionId}/return`, { method: 'POST' });
    await fetchAllData();
  }
  
  const revertSaleItem = async (transactionId: string, sku: string) => {
    // This needs a dedicated API endpoint
    // await apiFetch(`/api/sales/transaction/${transactionId}/revert`, { method: 'POST', body: JSON.stringify({ sku }) });
    await fetchAllData();
  }

  const getProductBySku = async (sku: string) => {
    return await apiFetch(`/api/products?sku=${sku}`);
  };

  const archiveProduct = async (itemId: string, isArchived: boolean) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'PUT', body: JSON.stringify({ isArchived }) });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isArchived: isArchived } : i));
  };
  
  const deleteProductPermanently = async (itemId: string) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== itemId));
  }
  
  const addAccessory = async (accessory: Omit<Accessory, 'id' | 'history'>) => {
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify({ ...accessory, type: 'accessory' }) });
    await fetchAllData();
  };

  const updateAccessory = async (accessoryId: string, accessoryData: Omit<Accessory, 'id'| 'history'>) => {
    await apiFetch(`/api/products/${accessoryId}`, { method: 'PUT', body: JSON.stringify({ ...accessoryData, type: 'accessory' }) });
    await fetchAllData();
  };
  
  const adjustAccessoryStock = async (accessoryId: string, change: number, reason: string) => {
    await apiFetch(`/api/products/${accessoryId}/stock`, { method: 'POST', body: JSON.stringify({ change, reason, type: 'accessory' }) });
    await fetchAllData();
  };

  const findShippingReceiptByAwb = async (awb: string) => {
    return await apiFetch(`/api/shipping/receipts?awb=${awb}`).then(res => res.receipts[0] || null);
  };
  
  const fetchShippingReceipts = async (options: { page: number; limit: number; channel?: string; salesChannel?: string; date_range?: {from: Date | null, to: Date}; status?: string[]; awb?: string; }) => {
    const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
    });
    if (options.salesChannel) params.append('salesChannel', options.salesChannel);
    if (options.channel) params.append('channel', options.channel);
    if (options.awb) params.append('awb', options.awb);
    if (options.status) params.append('status', options.status.join(','));
    if (options.date_range?.from) params.append('from', options.date_range.from.toISOString());
    if (options.date_range?.to) params.append('to', options.date_range.to.toISOString());

    return await apiFetch(`/api/shipping/receipts?${params.toString()}`);
  };

  const addShippingReceipt = async (receipt: Omit<ShippingReceipt, 'id'>) => {
    const newReceipt = await apiFetch('/api/shipping/receipts', { method: 'POST', body: JSON.stringify(receipt) });
    setAllShippingReceipts(prev => [newReceipt, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newReceipt;
  };
  
  const addPrintedReceipts = async (date: string, salesChannel: string, shippingChannel: string, count: number) => {
    // await addPrintedReceiptsDb(date, salesChannel, shippingChannel, count);
  };

  const getPrintedReceiptCountsForDate = async (date: string) => {
      // return getPrintedReceiptCountsForDateDb(date);
      return [];
  };

  const deleteShippingReceipt = async (id: number) => {
    await apiFetch(`/api/shipping/receipts/${id}`, { method: 'DELETE' });
    setAllShippingReceipts(prev => prev.filter(r => r.id !== id));
  };

  const updateShippingReceiptsStatus = async (ids: number[], status: string) => {
    await apiFetch(`/api/shipping/receipts/status`, { method: 'PUT', body: JSON.stringify({ ids, status }) });
    setAllShippingReceipts(prev => prev.map(r => ids.includes(r.id) ? {...r, status} : r));
  };

  const updateShippingReceiptStatus = async (id: number, status: string) => {
    await apiFetch(`/api/shipping/receipts/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    setAllShippingReceipts(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteImportHistory = async (id: number) => {
    // await deleteBulkImportHistoryDb(id);
  }

  const getReceiptCountByStatus = async (status: string) => {
    return await apiFetch(`/api/shipping/counts?status=${status}`);
  }
  
  const getPendingReceiptsBeforeDate = async (date: Date) => {
      // return await getPendingReceiptsBeforeDateDb(date);
      return 0;
  }

  const clearPosTransactions = async (date: Date) => {
    // await clearPosTransactionsDb(date);
  };

  const fetchDiscountGroups = useCallback(async () => {
    // const groups = await fetchDiscountGroupsDb();
    // setDiscountGroups(groups);
  }, []);
  
  const addDiscountGroup = async (group: Omit<DiscountGroup, 'id'|'productCount'>) => {
      // await addDiscountGroupDb(group);
      await fetchAllData();
  }
  const editDiscountGroup = async (id: number, group: Omit<DiscountGroup, 'id'|'productCount'>) => {
      // await editDiscountGroupDb(id, group);
      await fetchAllData();
  }
  const deleteDiscountGroup = async (id: number) => {
      // await deleteDiscountGroupDb(id);
      await fetchAllData();
  }
  const getDiscountGroup = async (id: number) => {
      // return await getDiscountGroupDb(id);
      return null;
  }
  
  const checkPrintedReceiptAvailability = async (salesChannel: string, shippingChannel: string, date: Date) => {
      // This logic should now be on the server. The client will just get an error.
      return true;
  }


  return (
    <InventoryContext.Provider value={{ 
        items, 
        addItem,
        bulkAddProducts,
        bulkUpdateProducts,
        updateItem, 
        bulkUpdateVariants, 
        updateStock, 
        getHistory, 
        getItem, 
        categories, 
        fetchItems: fetchAllData,
        loading,
        recordSale,
        recordSaleWithReceipt,
        fetchSales,
        cancelSaleTransaction,
        returnSaleTransaction,
        revertSaleItem,
        getProductBySku,
        allSales,
        resellers,
        addReseller,
        editReseller,
        deleteReseller,
        fetchResellers: fetchAllData,
        archiveProduct,
        deleteProductPermanently,
        accessories,
        addAccessory,
        updateAccessory,
        adjustAccessoryStock,
        allShippingReceipts,
        fetchShippingReceipts,
        findShippingReceiptByAwb,
        addShippingReceipt,
        deleteShippingReceipt,
        updateShippingReceiptsStatus,
        updateShippingReceiptStatus,
        fetchShippingReceiptCounts: async () => ({ salesChannels: {}, shippingChannels: {}, statuses: {} }),
        getReceiptCountByStatus,
        getPendingReceiptsBeforeDate,
        addPrintedReceipts,
        getPrintedReceiptCountsForDate,
        checkPrintedReceiptAvailability,
        fetchImportHistory: async () => [],
        deleteImportHistory,
        clearPosTransactions,
        pendingTransaction,
        loadPendingTransaction,
        clearPendingTransaction,
        discountGroups,
        fetchDiscountGroups,
        addDiscountGroup,
        editDiscountGroup,
        getDiscountGroup,
        deleteDiscountGroup,
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

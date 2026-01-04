

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, ChannelPrice, Accessory, ShippingReceipt, BulkImportHistory, User, ReturnedItem, DiscountGroup, DiscountedProduct, PrintedReceiptCount } from '@/types';
import { categories as allCategories } from '@/types';
import { useToast } from './use-toast';
import { format as formatDate, parseISO, startOfDay, endOfDay } from 'date-fns';
import { apiFetch } from '@/lib/api';


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
      const [inventoryData, salesData, resellerData, receiptData, discountData] = await Promise.all([
          apiFetch('/api/products'),
          apiFetch('/api/sales').then(res => res.sales),
          apiFetch('/api/resellers'),
          apiFetch('/api/shipping/receipts?limit=100000').then(res => res.receipts),
          apiFetch('/api/finance/discounts'),
      ]);
      setItems(inventoryData.products);
      setAccessories(inventoryData.accessories);
      setAllSales(salesData);
      setResellers(resellerData);
      setAllShippingReceipts(receiptData);
      setDiscountGroups(discountData);
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
    await apiFetch('/api/resellers', { method: 'POST', body: JSON.stringify({ name, phone, address }) });
    await fetchAllData();
  };
  
  const editReseller = async (id: number, data: Omit<Reseller, 'id'>) => {
    await apiFetch(`/api/resellers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchAllData();
  };
  
  const deleteReseller = async (id: number) => {
    await apiFetch(`/api/resellers/${id}`, { method: 'DELETE' });
    await fetchAllData();
  };

  const addItem = async (itemData: any) => {
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(itemData) });
    await fetchAllData();
  };
  
  const bulkAddProducts = async (products: any[], fileName: string): Promise<{ addedCount: number, skippedCount: number, addedSkus: any[], skippedSkus: any[] }> => {
    const result = await apiFetch('/api/products/bulk-add', { method: 'POST', body: JSON.stringify({ products, fileName }) });
    await fetchAllData();
    return result;
  };
  
  const bulkUpdateProducts = async (products: any[]): Promise<{ updatedCount: number; notFoundSkus: string[] }> => {
    const result = await apiFetch('/api/products/bulk-update', { method: 'POST', body: JSON.stringify({ products }) });
    await fetchAllData();
    return result;
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'PUT', body: JSON.stringify(itemData) });
    await fetchAllData();
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[], reason: string) => {
     await apiFetch(`/api/products/${itemId}/variants-bulk-update`, { method: 'POST', body: JSON.stringify({ variants, reason }) });
     await fetchAllData();
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    await apiFetch(`/api/products/${itemId}/stock`, { method: 'POST', body: JSON.stringify({ change, reason }) });
    await fetchAllData();
  };
  
  const getHistory = async (itemId: string): Promise<AdjustmentHistory[]> => {
    const item = items.find(i => i.id === itemId);
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

  const recordSale = async (channel: string, quantity: number, options: any): Promise<any> => {
    const salePayload = {
      sales: options.sales,
      options: { ...options, channel }
    };
    if (options.status === 'Completed' && options.transactionId && options.transactionId.startsWith('trans-')) {
        await cancelSaleTransaction(options.transactionId);
    }
    const result = await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(salePayload) });
    await fetchAllData(); // Re-sync state
    return result;
  };
  
  const recordSaleWithReceipt = async (receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) => {
      await apiFetch('/api/sales/online', { method: 'POST', body: JSON.stringify({ receipt: receiptData, sales: salesData }) });
      await fetchAllData();
  };


  const fetchSales = async (channel: string, date: Date, page: number, limit: number): Promise<{ sales: Sale[], total: number }> => {
    const dateString = date.toISOString().split('T')[0];
    const url = `/api/sales?channel=${channel}&startDate=${dateString}&endDate=${dateString}&page=${page}&limit=${limit}`;
    const result = await apiFetch(url);
    return { sales: result.sales, total: result.total };
  };
  
  const cancelSaleTransaction = async (transactionId: string) => {
    await apiFetch(`/api/sales/transaction/${transactionId}`, { method: 'DELETE' });
    await fetchAllData();
  }
  
  const returnSaleTransaction = async (transactionId: string, items?: ReturnedItem[]) => {
    await apiFetch(`/api/sales/transaction/${transactionId}/return`, { method: 'POST', body: JSON.stringify({ items: items || [] }) });
    await fetchAllData();
  }
  
  const revertSaleItem = async (transactionId: string, sku: string) => {
    await apiFetch(`/api/sales/transaction/${transactionId}/revert`, { method: 'POST', body: JSON.stringify({ sku }) });
    await fetchAllData();
  }
  
  const findProductBySku = useCallback(async (sku: string): Promise<InventoryItem | null> => {
    const lowerSku = sku.toLowerCase();

    // First check variants, as they are more specific
    for (const item of items) {
        if (item.variants && item.variants.length > 0) {
            for (const variant of item.variants) {
                if (variant.sku && variant.sku.toLowerCase() === lowerSku) {
                    // Found a variant, return the parent item with only this variant
                    return {
                        ...item,
                        variants: [{...variant, parentName: item.name}]
                    };
                }
            }
        }
    }

    // If not found in variants, check parent products (or simple products)
    const product = items.find(item => item.sku && item.sku.toLowerCase() === lowerSku);
    if (product) {
        return product;
    }
    
    // If still not found, check by name
     const productByName = items.find(item => item.name.toLowerCase() === lowerSku);
     if(productByName) return productByName;


    return null;
}, [items]);


  const archiveProduct = async (itemId: string, isArchived: boolean) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'PUT', body: JSON.stringify({ isArchived }) });
    await fetchAllData();
  };
  
  const deleteProductPermanently = async (itemId: string) => {
    await apiFetch(`/api/products/${itemId}`, { method: 'DELETE' });
    await fetchAllData();
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

  const findShippingReceiptByAwb = async (awb: string): Promise<ShippingReceipt | null> => {
    const result = await apiFetch(`/api/shipping/receipts?awb=${awb}`);
    return result?.receipts?.[0] || null;
  };
  
  const fetchShippingReceipts = async (options: { page: number; limit: number; channel?: string; salesChannel?: string; dateString?: string; date_range?: { from: Date, to: Date }; status?: string[]; awb?: string; }) => {
    const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
    });
    if (options.salesChannel) params.append('salesChannel', options.salesChannel);
    if (options.channel) params.append('channel', options.channel);
    if (options.awb) params.append('awb', options.awb);
    if (options.status && options.status.length > 0) params.append('status', options.status.join(','));
    if (options.dateString) params.append('date', options.dateString);
    if (options.date_range) {
        params.append('startDate', options.date_range.from.toISOString());
        params.append('endDate', options.date_range.to.toISOString());
    }

    return await apiFetch(`/api/shipping/receipts?${params.toString()}`);
  };

  const addShippingReceipt = async (receipt: Omit<ShippingReceipt, 'id'>) => {
    const newReceipt = await apiFetch('/api/shipping/receipts', { method: 'POST', body: JSON.stringify(receipt) });
    await fetchAllData();
    return newReceipt;
  };
  
  const addPrintedReceipts = async (date: string, salesChannel: string, shippingChannel: string, count: number) => {
    await apiFetch('/api/shipping/printed-receipts', { method: 'POST', body: JSON.stringify({ date, salesChannel, shippingChannel, count }) });
  };

  const getPrintedReceiptCountsForDate = async (date: string) => {
      return await apiFetch(`/api/shipping/printed-receipts?date=${date}`);
  };

  const deleteShippingReceipt = async (id: number) => {
    await apiFetch(`/api/shipping/receipts/${id}`, { method: 'DELETE' });
    await fetchAllData();
  };

  const updateShippingReceiptsStatus = async (ids: number[], status: string) => {
    await apiFetch(`/api/shipping/receipts/status`, { method: 'PUT', body: JSON.stringify({ ids, status }) });
    await fetchAllData();
  };

  const updateShippingReceiptStatus = async (id: number, status: string) => {
    await apiFetch(`/api/shipping/receipts/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await fetchAllData();
  };

  const deleteImportHistory = async (id: number) => {
    await apiFetch(`/api/products/bulk-add/${id}`, { method: 'DELETE' });
  }

  const getReceiptCountByStatus = async (status: string) => {
    return await apiFetch(`/api/shipping/receipts/counts?status=${status}`);
  }
  
  const getPendingReceiptsBeforeDate = async (date: Date) => {
      const result = await apiFetch(`/api/shipping/receipts/pending-count?before=${date.toISOString()}`);
      return result.count;
  }

  const clearPosTransactions = async (date: Date) => {
    await apiFetch(`/api/sales/pos-history?date=${date.toISOString()}`, { method: 'DELETE' });
    await fetchAllData();
  };

  const fetchDiscountGroups = useCallback(async () => {
    const groups = await apiFetch('/api/finance/discounts');
    setDiscountGroups(groups);
  }, []);
  
  const addDiscountGroup = async (group: Omit<DiscountGroup, 'id'|'productCount'>) => {
      await apiFetch('/api/finance/discounts', { method: 'POST', body: JSON.stringify(group) });
      await fetchAllData();
  }
  const editDiscountGroup = async (id: number, group: Omit<DiscountGroup, 'id'|'productCount'>) => {
      await apiFetch(`/api/finance/discounts/${id}`, { method: 'PUT', body: JSON.stringify(group) });
      await fetchAllData();
  }
  const deleteDiscountGroup = async (id: number) => {
      await apiFetch(`/api/finance/discounts/${id}`, { method: 'DELETE' });
      await fetchAllData();
  }
  const getDiscountGroup = async (id: number) => {
      return await apiFetch(`/api/finance/discounts/${id}`);
  }
  
  const getActiveDiscountPrice = async (productId: string | number, variantId: string | number | null, category: string, channel: string): Promise<number | null> => {
      const response = await apiFetch('/api/finance/discounts/get-active-price', {
          method: 'POST',
          body: JSON.stringify({ productId, variantId, category, channel }),
      });
      return response.price;
  };
  
  const checkPrintedReceiptAvailability = async (salesChannel: string, shippingChannel: string, date: string) => {
      const result = await apiFetch('/api/shipping/printed-receipts/check', {
          method: 'POST',
          body: JSON.stringify({ salesChannel, shippingChannel, date })
      });
      return result.isAvailable;
  }

  const fetchImportHistory = async () => {
      return await apiFetch('/api/products/bulk-add');
  }
  
  const fetchShippingReceiptCounts = async (filters: { dateString?: string; salesChannel?: string; shippingChannel?: string; status?: string[]; }) => {
    const params = new URLSearchParams();
    if(filters.dateString) params.append('date', filters.dateString);
    if(filters.salesChannel) params.append('salesChannel', filters.salesChannel);
    if(filters.shippingChannel) params.append('shippingChannel', filters.shippingChannel);
    if(filters.status && filters.status.length > 0) params.append('status', filters.status.join(','));
    return await apiFetch(`/api/shipping/receipts/counts?${params.toString()}`);
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
        findProductBySku,
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
        fetchShippingReceiptCounts,
        getReceiptCountByStatus,
        getPendingReceiptsBeforeDate,
        addPrintedReceipts,
        getPrintedReceiptCountsForDate,
        checkPrintedReceiptAvailability,
        fetchImportHistory,
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

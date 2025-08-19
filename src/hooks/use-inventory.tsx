

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, ManualJournalEntry, ShippingReceipt } from '@/types';
import {
  fetchInventoryData,
  addProduct,
  editProduct,
  adjustStock,
  editVariantsBulk,
  performSale,
  getSalesByDate,
  revertSale,
  findProductBySku,
  fetchAllSales,
  revertSaleByTransaction,
  getResellers,
  addReseller as addResellerDb,
  editReseller as editResellerDb,
  deleteReseller as deleteResellerDb,
  updatePrices as updatePricesDb,
  addManualJournalEntry,
  fetchManualJournalEntries,
  addShippingReceipt,
  fetchShippingReceipts,
  deleteShippingReceipt,
} from '@/lib/inventory-service';


interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => Promise<void>;
  updateItem: (itemId: string, itemData: any) => Promise<void>;
  updateStock: (itemId: string, change: number, reason: string) => Promise<void>;
  getItem: (itemId: string) => InventoryItem | undefined;
  getHistory: (itemId: string) => Promise<AdjustmentHistory[]>;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[]) => Promise<void>;
  fetchItems: () => Promise<void>;
  loading: boolean;
  recordSale: (sku: string, channel: string, quantity: number, options?: { saleDate?: Date; transactionId?: string; paymentMethod?: string; resellerName?: string; }) => Promise<void>;
  fetchSales: (channel: string, date: Date) => Promise<Sale[]>;
  cancelSale: (saleId: string) => Promise<void>;
  cancelSaleTransaction: (transactionId: string) => Promise<void>;
  getProductBySku: (sku: string) => Promise<InventoryItem | null>;
  allSales: Sale[];
  resellers: Reseller[];
  addReseller: (name: string, phone?: string, address?: string) => Promise<void>;
  editReseller: (id: number, data: Omit<Reseller, 'id'>) => Promise<void>;
  deleteReseller: (id: number) => Promise<void>;
  fetchResellers: () => Promise<void>;
  updatePrices: (updates: any[]) => Promise<void>;
  manualJournalEntries: ManualJournalEntry[];
  createManualJournalEntry: (entry: Omit<ManualJournalEntry, 'id' | 'type'>) => Promise<void>;
  shippingReceipts: ShippingReceipt[];
  scanReceipt: (receiptNumber: string, shippingService: string) => Promise<void>;
  fetchReceipts: () => Promise<void>;
  removeReceipt: (id: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [manualJournalEntries, setManualJournalEntries] = useState<ManualJournalEntry[]>([]);
  const [shippingReceipts, setShippingReceipts] = useState<ShippingReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, salesData, resellerData, manualEntries, receiptData] = await Promise.all([
        fetchInventoryData(),
        fetchAllSales(),
        getResellers(),
        fetchManualJournalEntries(),
        fetchShippingReceipts(),
      ]);
      
      setItems(inventoryData.items);
      setCategories(inventoryData.categories);
      setAllSales(salesData);
      setResellers(resellerData);
      setManualJournalEntries(manualEntries);
      setShippingReceipts(receiptData);

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchReceipts = useCallback(async () => {
    const data = await fetchShippingReceipts();
    setShippingReceipts(data);
  }, []);

  const scanReceipt = async (receiptNumber: string, shippingService: string) => {
    await addShippingReceipt(receiptNumber, shippingService);
    await fetchReceipts();
  };

  const removeReceipt = async (id: string) => {
    await deleteShippingReceipt(id);
    await fetchReceipts();
  }
  
  const createManualJournalEntry = async (entry: Omit<ManualJournalEntry, 'id' | 'type'>) => {
    await addManualJournalEntry(entry);
    await fetchAllData();
  }

  const fetchResellers = useCallback(async () => {
    try {
      const resellerData = await getResellers();
      setResellers(resellerData);
    } catch(error) {
      console.error("Failed to fetch resellers:", error);
    }
  }, []);

  const addReseller = async (name: string, phone?: string, address?: string) => {
    await addResellerDb(name, phone, address);
    await fetchResellers();
  };
  
  const editReseller = async (id: number, data: Omit<Reseller, 'id'>) => {
    await editResellerDb(id, data);
    await fetchResellers();
  };
  
  const deleteReseller = async (id: number) => {
    await deleteResellerDb(id);
    await fetchResellers();
  };

  const addItem = async (itemData: any) => {
    await addProduct(itemData);
    await fetchAllData();
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await editProduct(itemId, itemData);
    await fetchAllData();
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[]) => {
    await editVariantsBulk(itemId, variants);
    await fetchAllData();
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    await adjustStock(itemId, change, reason);
    await fetchAllData();
  };
  
  const getHistory = async (itemId: string): Promise<AdjustmentHistory[]> => {
    const item = getItem(itemId);
    if(item && 'history' in item && item.history) {
      return item.history;
    }
    return [];
  };

  const getItem = useCallback((itemId: string): InventoryItem | undefined => {
    for (const parentItem of items) {
      if (parentItem.id === itemId) {
        return parentItem;
      }
      if (parentItem.variants?.some(v => v.id === itemId)) {
        return parentItem;
      }
    }
    return undefined;
  }, [items]);

  const recordSale = async (sku: string, channel: string, quantity: number, options?: { saleDate?: Date, transactionId?: string, paymentMethod?: string, resellerName?: string }) => {
    await performSale(sku, channel, quantity, options);
    // After a sale, we need fresh data for both inventory and sales history
    await fetchAllData();
  };

  const fetchSales = async (channel: string, date: Date): Promise<Sale[]> => {
    return await getSalesByDate(channel, date);
  };
  
  const cancelSale = async (saleId: string) => {
    await revertSale(saleId);
    await fetchAllData();
  };

  const cancelSaleTransaction = async (transactionId: string) => {
    await revertSaleByTransaction(transactionId);
    await fetchAllData();
  }

  const getProductBySku = async (sku: string) => {
    return await findProductBySku(sku);
  };

  const updatePrices = async (updates: any[]) => {
    await updatePricesDb(updates);
    await fetchAllData();
  };

  return (
    <InventoryContext.Provider value={{ 
        items, 
        addItem, 
        updateItem, 
        bulkUpdateVariants, 
        updateStock, 
        getHistory, 
        getItem, 
        categories, 
        fetchItems: fetchAllData,
        loading,
        recordSale,
        fetchSales,
        cancelSale,
        cancelSaleTransaction,
        getProductBySku,
        allSales,
        resellers,
        addReseller,
        editReseller,
        deleteReseller,
        fetchResellers,
        updatePrices,
        manualJournalEntries,
        createManualJournalEntry,
        shippingReceipts,
        scanReceipt,
        fetchReceipts,
        removeReceipt
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

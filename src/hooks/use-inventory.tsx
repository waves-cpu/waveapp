
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller } from '@/types';
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
  fetchResellers: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, salesData, resellerData] = await Promise.all([
        fetchInventoryData(),
        fetchAllSales(),
        getResellers(),
      ]);
      
      setItems(inventoryData.items);
      setCategories(inventoryData.categories);
      setAllSales(salesData);
      setResellers(resellerData);

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
    // For channels other than marketplace ones, we don't need to refetch all sales, just inventory.
    if (['shopee', 'lazada', 'tiktok'].includes(channel)) {
      await fetchAllData();
    } else {
       const inventoryData = await fetchInventoryData();
       setItems(inventoryData.items);
       setCategories(inventoryData.categories);
    }
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
        fetchResellers
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

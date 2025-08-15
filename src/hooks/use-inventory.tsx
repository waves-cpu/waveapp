'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant } from '@/types';
import {
  fetchInventoryData,
  addProduct,
  editProduct,
  adjustStock,
  editVariantsBulk
} from '@/lib/inventory-service';


interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => Promise<void>;
  updateItem: (itemId: string, itemData: any) => Promise<void>;
  updateStock: (itemId: string, change: number, reason: string) => Promise<void>;
  getItem: (itemId: string) => InventoryItem | InventoryItemVariant | undefined;
  getHistory: (itemId: string) => Promise<AdjustmentHistory[]>;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[]) => Promise<void>;
  fetchItems: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInventoryData();
      setItems(data.items);
      setCategories(data.categories);
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
      // Handle error appropriately, maybe set an error state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);


  const addItem = async (itemData: any) => {
    await addProduct(itemData);
    await fetchItems();
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await editProduct(itemId, itemData);
    await fetchItems();
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[]) => {
    await editVariantsBulk(itemId, variants);
    await fetchItems();
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    await adjustStock(itemId, change, reason);
    await fetchItems();
  };
  
  const getHistory = async (itemId: string): Promise<AdjustmentHistory[]> => {
    // This is problematic as it needs a DB call. For now, let's return from local state.
    // A proper implementation would have a dedicated service function.
    const item = getItem(itemId);
    if(item && 'history' in item && item.history) {
      return item.history;
    }
    return [];
  };

  const getItem = (itemId: string): InventoryItem | InventoryItemVariant | undefined => {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      if (item.variants) {
        const variant = item.variants.find(v => v.id === itemId);
        if (variant) {
          return item; 
        }
      }
    }
    return undefined;
  };

  return (
    <InventoryContext.Provider value={{ items, addItem, updateItem, bulkUpdateVariants, updateStock, getHistory, getItem, categories, fetchItems }}>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <p>Loading inventory...</p>
        </div>
      ) : children}
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

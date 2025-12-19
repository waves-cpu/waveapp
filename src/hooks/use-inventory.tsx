

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, Accessory, ShippingReceipt, BulkImportHistory, User } from '@/types';
import { categories as allCategories } from '@/types';
import {
  fetchInventoryData,
  addProduct,
  bulkAddProducts as bulkAddProductsDb,
  editProduct,
  adjustStock,
  editVariantsBulk,
  performSale,
  getSalesByDate,
  revertSale,
  findProductBySku,
  fetchAllSales,
  revertSaleByTransaction,
  revertSaleItem,
  getResellers,
  addReseller as addResellerDb,
  editReseller as editResellerDb,
  deleteReseller as deleteResellerDb,
  updatePrices as updatePricesDb,
  addAccessory as addAccessoryDb,
  updateAccessory as updateAccessoryDb,
  adjustAccessoryStock as adjustAccessoryStockDb,
  archiveProduct as archiveProductDb,
  deleteProductPermanently as deleteProductPermanentlyDb,
  fetchShippingReceipts as fetchShippingReceiptsDb,
  addShippingReceipt as addShippingReceiptDb,
  deleteShippingReceipt as deleteShippingReceiptDb,
  updateShippingReceiptsStatus,
  updateShippingReceiptStatus,
  fetchShippingReceiptCountsByChannel,
  fetchShippingReceiptCountsByStatus,
  getReceiptCountByStatus as getReceiptCountByStatusDb,
  addBulkImportHistory,
  updateBulkImportHistory,
  fetchBulkImportHistory,
  deleteBulkImportHistory as deleteBulkImportHistoryDb,
  getPendingReceiptsBeforeDate as getPendingReceiptsBeforeDateDb,
} from '@/lib/inventory-service';


interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => Promise<void>;
  bulkAddProducts: (products: any[], fileName: string) => Promise<BulkImportHistory>;
  updateItem: (itemId: string, itemData: any) => Promise<void>;
  updateStock: (itemId: string, change: number, reason: string) => Promise<void>;
  getItem: (itemId: string) => InventoryItem | undefined;
  getHistory: (itemId: string) => Promise<AdjustmentHistory[]>;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[], reason: string) => Promise<void>;
  fetchItems: () => Promise<void>;
  loading: boolean;
  recordSale: (sku: string, channel: string, quantity: number, options?: { saleDate?: Date; transactionId?: string; paymentMethod?: string; resellerName?: string; priceAtSale?: number; status?: string; }) => Promise<{ sale: Sale; updatedItem: InventoryItem }>;
  fetchSales: (channel: string, date: Date, page: number, limit: number) => Promise<{sales: Sale[], total: number}>;
  cancelSale: (saleId: string) => Promise<void>;
  cancelSaleTransaction: (transactionId: string) => Promise<void>;
  revertSaleItem: (transactionId: string, sku: string) => Promise<void>;
  getProductBySku: (sku: string) => Promise<InventoryItem | null>;
  allSales: Sale[];
  resellers: Reseller[];
  addReseller: (name: string, phone?: string, address?: string) => Promise<void>;
  editReseller: (id: number, data: Omit<Reseller, 'id'>) => Promise<void>;
  deleteReseller: (id: number) => Promise<void>;
  fetchResellers: () => Promise<void>;
  updatePrices: (updates: any[]) => Promise<void>;
  archiveProduct: (itemId: string, isArchived: boolean) => Promise<void>;
  deleteProductPermanently: (itemId: string) => Promise<void>;
  // Accessories
  accessories: Accessory[];
  addAccessory: (accessory: Omit<Accessory, 'id' | 'history'>) => Promise<void>;
  updateAccessory: (accessoryId: string, accessoryData: Omit<Accessory, 'id' | 'history'>) => Promise<void>;
  adjustAccessoryStock: (accessoryId: string, change: number, reason: string) => Promise<void>;
  // Shipping
  shippingReceipts: ShippingReceipt[];
  fetchShippingReceipts: (options: { page: number; limit: number; salesChannel?: string; channel?: string; date?: Date; date_range?: { from: Date; to: Date }; status?: string[]; awb?: string; }) => Promise<{ receipts: ShippingReceipt[]; total: number; }>;
  addShippingReceipt: (receipt: Omit<ShippingReceipt, 'id'>) => Promise<ShippingReceipt>;
  deleteShippingReceipt: (id: number) => Promise<void>;
  updateShippingReceiptsStatus: (ids: number[], status: string) => Promise<void>;
  updateShippingReceiptStatus: (id: number, status: string) => Promise<void>;
  fetchShippingReceiptCountsByChannel: (dateString?: string, status?: string[]) => Promise<Record<string, number>>;
  fetchShippingReceiptCountsByStatus: (dateString?: string, channel?: string, salesChannel?: string) => Promise<Record<string, number>>;
  getReceiptCountByStatus: (status: string[], dateRange: { from: Date, to: Date }) => Promise<number>;
  getPendingReceiptsBeforeDate: (date: Date) => Promise<number>;
  // Bulk Import History
  fetchImportHistory: () => Promise<BulkImportHistory[]>;
  deleteImportHistory: (id: number) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [categories, setCategories] = useState<string[]>(allCategories);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [shippingReceipts, setShippingReceipts] = useState<ShippingReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [inventoryData, salesData, resellerData, shippingData] = await Promise.all([
        fetchInventoryData(),
        fetchAllSales(),
        getResellers(),
        fetchShippingReceiptsDb({ page: 1, limit: 1000 }), // Fetch initial receipts
      ]);
      
      setItems(inventoryData.items);
      setAccessories(inventoryData.accessories);
      setAllSales(salesData);
      setResellers(resellerData);
      setShippingReceipts(shippingData.receipts);

    } catch (error) {
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
  
  const bulkAddProducts = async (products: any[], fileName: string): Promise<BulkImportHistory> => {
    const historyEntry = await addBulkImportHistory({
        fileName,
        date: new Date().toISOString(),
        status: 'Memproses...',
    });

    try {
        const plainData = JSON.parse(JSON.stringify(products));
        const result = await bulkAddProductsDb(plainData);
        const finalData: Partial<BulkImportHistory> = {
            status: 'Berhasil',
            addedCount: result.addedProducts.length,
            skippedCount: result.skippedProducts.length,
            addedSkus: result.addedProducts,
            skippedSkus: result.skippedProducts
        };
        await updateBulkImportHistory(historyEntry.id, finalData);
        
        // Refetch all data to update the inventory list
        await fetchAllData();

        // Return the complete, updated history entry
        return { ...historyEntry, ...finalData, id: historyEntry.id };
        
    } catch (error) {
         const finalData = {
            status: 'Gagal' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        await updateBulkImportHistory(historyEntry.id, finalData);
        // Even on failure, refetch to ensure UI is consistent
        await fetchAllData();
        throw error;
    }
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await editProduct(itemId, itemData);
    await fetchAllData();
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[], reason: string) => {
    await editVariantsBulk(itemId, variants, reason);
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

  const recordSale = async (sku: string, channel: string, quantity: number, options?: { saleDate?: Date, transactionId?: string, paymentMethod?: string, resellerName?: string, priceAtSale?: number, status?: string }): Promise<{ sale: Sale; updatedItem: InventoryItem }> => {
    const { sale, updatedItem } = await performSale(sku, channel, quantity, options);
    // Optimistic update
    setAllSales(prevSales => [sale, ...prevSales]);
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
    return { sale, updatedItem };
  };

  const fetchSales = async (channel: string, date: Date, page: number, limit: number): Promise<{ sales: Sale[], total: number }> => {
    return await getSalesByDate(channel, date, page, limit);
  };
  
  const cancelSale = async (saleId: string) => {
    await revertSale(saleId);
    await fetchAllData();
  };

  const cancelSaleTransaction = async (transactionId: string) => {
    await revertSaleByTransaction(transactionId);
    await fetchAllData();
  }
  
  const _revertSaleItem = async (transactionId: string, sku: string) => {
      await revertSaleItem(transactionId, sku);
      await fetchAllData();
  }

  const getProductBySku = async (sku: string) => {
    return await findProductBySku(sku);
  };

  const updatePrices = async (updates: any[]) => {
    await updatePricesDb(updates);
    await fetchAllData();
  };

  const archiveProduct = async (itemId: string, isArchived: boolean) => {
    await archiveProductDb(itemId, isArchived);
    await fetchAllData();
  };
  
  const deleteProductPermanently = async (itemId: string) => {
    await deleteProductPermanentlyDb(itemId);
    await fetchAllData();
  }
  
  const addAccessory = async (accessory: Omit<Accessory, 'id' | 'history'>) => {
    await addAccessoryDb(accessory);
    await fetchAllData();
  };
  const updateAccessory = async (accessoryId: string, accessoryData: Omit<Accessory, 'id' | 'history'>) => {
    await updateAccessoryDb(accessoryId, accessoryData);
    await fetchAllData();
  };
  const adjustAccessoryStock = async (accessoryId: string, change: number, reason: string) => {
    await adjustAccessoryStockDb(accessoryId, change, reason);
    await fetchAllData();
  };

  const _fetchShippingReceipts = async (options: { page: number; limit: number; channel?: string; salesChannel?: string; date?: Date; date_range?: {from: Date, to: Date}; status?: string[]; awb?: string; }) => {
    return await fetchShippingReceiptsDb({ ...options });
  };
  

  const addShippingReceipt = async (receipt: Omit<ShippingReceipt, 'id'>) => {
    return await addShippingReceiptDb(receipt);
  };

  const deleteShippingReceipt = async (id: number) => {
    await deleteShippingReceiptDb(id);
    // Refetching is handled by the page component.
  };

  const deleteImportHistory = async (id: number) => {
    await deleteBulkImportHistoryDb(id);
  }

  const getReceiptCountByStatus = async (status: string[], dateRange: { from: Date, to: Date }) => {
    return await getReceiptCountByStatusDb(status, dateRange);
  }
  
  const getPendingReceiptsBeforeDate = async (date: Date) => {
      return await getPendingReceiptsBeforeDateDb(date);
  }

  return (
    <InventoryContext.Provider value={{ 
        items, 
        addItem,
        bulkAddProducts,
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
        revertSaleItem: _revertSaleItem,
        getProductBySku,
        allSales,
        resellers,
        addReseller,
        editReseller,
        deleteReseller,
        fetchResellers,
        updatePrices,
        archiveProduct,
        deleteProductPermanently,
        accessories,
        addAccessory,
        updateAccessory,
        adjustAccessoryStock,
        shippingReceipts,
        fetchShippingReceipts: _fetchShippingReceipts,
        addShippingReceipt,
        deleteShippingReceipt,
        updateShippingReceiptsStatus,
        updateShippingReceiptStatus,
        fetchShippingReceiptCountsByChannel,
        fetchShippingReceiptCountsByStatus,
        getReceiptCountByStatus,
        getPendingReceiptsBeforeDate,
        fetchImportHistory: fetchBulkImportHistory,
        deleteImportHistory,
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

    

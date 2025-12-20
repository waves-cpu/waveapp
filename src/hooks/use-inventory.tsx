
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
  updateShippingReceiptsStatus as updateShippingReceiptsDbStatus,
  updateShippingReceiptStatus,
  fetchShippingReceiptCounts,
  getReceiptCountByStatus as getReceiptCountByStatusDb,
  addBulkImportHistory,
  updateBulkImportHistory,
  fetchBulkImportHistory,
  deleteBulkImportHistory as deleteBulkImportHistoryDb,
  getPendingReceiptsBeforeDate as getPendingReceiptsBeforeDateDb,
  returnSaleTransaction,
  fetchSingleItem,
  fetchSingleAccessory,
  clearPosTransactions as clearPosTransactionsDb,
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
  recordSale: (sku: string, channel: string, quantity: number, options?: { saleDate?: Date; transactionId?: string; paymentMethod?: string; resellerName?: string; priceAtSale?: number; status?: string; }) => Promise<{ newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }>;
  fetchSales: (channel: string, date: Date, page: number, limit: number) => Promise<{sales: Sale[], total: number}>;
  cancelSale: (saleId: string) => Promise<void>;
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
  updatePrices: (updates: any[]) => Promise<void>;
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
  addShippingReceipt: (receipt: Omit<ShippingReceipt, 'id'>) => Promise<ShippingReceipt>;
  deleteShippingReceipt: (id: number) => Promise<void>;
  updateShippingReceiptsStatus: (ids: number[], status: string) => Promise<void>;
  updateShippingReceiptStatus: (id: number, status: string) => Promise<void>;
  fetchShippingReceiptCounts: (filters: { dateString?: string; salesChannel?: string; shippingChannel?: string; status?: string; }) => Promise<{ salesChannels: Record<string, number>; shippingChannels: Record<string, number>; statuses: Record<string, number>; }>;
  getReceiptCountByStatus: (status: string[], dateRange: { from: Date, to: Date }) => Promise<number>;
  getPendingReceiptsBeforeDate: (date: Date) => Promise<number>;
  // Bulk Import History
  fetchImportHistory: () => Promise<BulkImportHistory[]>;
  deleteImportHistory: (id: number) => Promise<void>;
  // POS
  clearPosTransactions: (date: Date) => Promise<void>;
  pendingTransaction: Sale[] | null;
  loadPendingTransaction: (sales: Sale[]) => void;
  clearPendingTransaction: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [categories, setCategories] = useState<string[]>(allCategories);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [allShippingReceipts, setAllShippingReceipts] = useState<ShippingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransaction, setPendingTransaction] = useState<Sale[] | null>(null);

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
        fetchInventoryData(),
        fetchAllSales(),
        getResellers(),
        fetchShippingReceiptsDb({ page: 1, limit: 100000 }) // Fetch all receipts
      ]);
      
      setItems(inventoryData.items);
      setAccessories(inventoryData.accessories);
      setAllSales(salesData);
      setResellers(resellerData);
      setAllShippingReceipts(receiptData.receipts);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const storedPending = sessionStorage.getItem('pendingTransaction');
    if (storedPending) {
        setPendingTransaction(JSON.parse(storedPending));
    }
  }, [fetchAllData]);

  
  const addReseller = async (name: string, phone?: string, address?: string) => {
    const newReseller = await addResellerDb(name, phone, address);
    setResellers(prev => [...prev, newReseller].sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const editReseller = async (id: number, data: Omit<Reseller, 'id'>) => {
    const updatedReseller = await editResellerDb(id, data);
    setResellers(prev => prev.map(r => r.id === id ? updatedReseller : r).sort((a, b) => a.name.localeCompare(b.name)));
  };
  
  const deleteReseller = async (id: number) => {
    await deleteResellerDb(id);
    setResellers(prev => prev.filter(r => r.id !== id));
  };

  const addItem = async (itemData: any) => {
    const newItemId = await addProduct(itemData);
    const newItem = await fetchSingleItem(newItemId);
    setItems(prev => [...prev, newItem]);
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
        
        await fetchAllData();

        return { ...historyEntry, ...finalData, id: historyEntry.id };
        
    } catch (error) {
         const finalData = {
            status: 'Gagal' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        await updateBulkImportHistory(historyEntry.id, finalData);
        await fetchAllData();
        throw error;
    }
  };

  const updateItem = async (itemId: string, itemData: any) => {
    await editProduct(itemId, itemData);
    const updatedItem = await fetchSingleItem(itemId);
    setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
  };

  const bulkUpdateVariants = async (itemId: string, variants: InventoryItemVariant[], reason: string) => {
    await editVariantsBulk(itemId, variants, reason);
    const updatedItem = await fetchSingleItem(itemId);
    setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
  };

  const updateStock = async (itemId: string, change: number, reason: string) => {
    const itemToUpdateLocally = items.find(i => i.id === itemId || i.variants?.some(v => v.id === itemId));
    
    // Optimistic update
    setItems(prevItems => prevItems.map(item => {
        if (item.id === itemToUpdateLocally?.id) {
            const updatedItem = JSON.parse(JSON.stringify(item)); // Deep copy
            if (updatedItem.variants && updatedItem.variants.length > 0) {
                const variant = updatedItem.variants.find((v: InventoryItemVariant) => v.id === itemId);
                if (variant) {
                    variant.stock += change;
                }
            } else if (updatedItem.id === itemId) {
                updatedItem.stock = (updatedItem.stock ?? 0) + change;
            }
            return updatedItem;
        }
        return item;
    }));

    try {
        await adjustStock(itemId, change, reason);
        // Re-fetch the single item to ensure consistency with DB (especially history)
        if (itemToUpdateLocally) {
            const freshItem = await fetchSingleItem(itemToUpdateLocally.id);
            setItems(prev => prev.map(i => i.id === itemToUpdateLocally.id ? freshItem : i));
        }
    } catch (error) {
        // Revert optimistic update on error
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemToUpdateLocally?.id) {
                return itemToUpdateLocally; // Revert to original state
            }
            return item;
        }));
        throw error;
    }
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

  const recordSale = async (sku: string, channel: string, quantity: number, options?: { saleDate?: Date, transactionId?: string, paymentMethod?: string, resellerName?: string, priceAtSale?: number, status?: string }): Promise<{ newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }> => {
    const { newSale, updatedItem, updatedAccessory } = await performSale(sku, channel, quantity, options);
    
    // Update local state
    setAllSales(prevSales => [newSale, ...prevSales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()));
    
    if (updatedItem) {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    }
    
    if (updatedAccessory) {
        setAccessories(prev => prev.map(acc => acc.id === updatedAccessory.id ? updatedAccessory : acc));
    }

    return { newSale, updatedItem, updatedAccessory };
  };


  const fetchSales = async (channel: string, date: Date, page: number, limit: number): Promise<{ sales: Sale[], total: number }> => {
    return await getSalesByDate(channel, date, page, limit);
  };
  
  const cancelSaleTransaction = async (transactionId: string) => {
    const affectedSales = await revertSaleByTransaction(transactionId, 'Cancelled');
    const affectedItemIds = new Set<string>();
    const affectedAccessoryIds = new Set<string>();

    affectedSales.forEach(sale => {
      if (sale.productId) affectedItemIds.add(sale.productId.toString());
      if (sale.accessoryId) affectedAccessoryIds.add(sale.accessoryId.toString());
    });

    // Instead of filtering, we just update the status locally for immediate feedback
    setAllSales(prev => prev.map(s => s.transactionId === transactionId ? { ...s, status: 'Cancelled' } : s));
    
    for (const id of affectedItemIds) {
        const updatedItem = await fetchSingleItem(id);
        setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    }

    for (const id of affectedAccessoryIds) {
        const updatedAccessory = await fetchSingleAccessory(id);
        setAccessories(prev => prev.map(acc => acc.id === id ? updatedAccessory : acc));
    }
  }
  
  const returnSaleTransaction = async (transactionId: string) => {
      const affectedSales = await revertSaleByTransaction(transactionId, 'Return Selesai');
      const affectedItemIds = new Set(affectedSales.map(s => s.productId));
      setAllSales(prev => prev.map(s => s.transactionId === transactionId ? { ...s, status: 'Return Selesai' } : s));
      affectedItemIds.forEach(async (id) => {
        if(id) {
          const updatedItem = await fetchSingleItem(id.toString());
          setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
        }
      });
  }
  
  const revertSaleItem = async (transactionId: string, sku: string) => {
      const revertedSale = await revertSaleItem(transactionId, sku);
      if(revertedSale && revertedSale.productId) {
        const updatedItem = await fetchSingleItem(revertedSale.productId);
        setItems(prev => prev.map(item => item.id === revertedSale.productId ? updatedItem : item));
        setAllSales(prev => prev.map(s => s.id === revertedSale.id ? revertedSale : s));
      }
  }

  const getProductBySku = async (sku: string) => {
    return await findProductBySku(sku);
  };

  const updatePrices = async (updates: any[]) => {
    await updatePricesDb(updates);
    const itemIds = new Set(updates.map(u => {
        const item = items.find(i => i.id === u.id || i.variants?.some(v => v.id === u.id));
        return item?.id;
    }).filter(Boolean));

    for (const id of itemIds) {
        const updatedItem = await fetchSingleItem(id as string);
        setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
    }
  };

  const archiveProduct = async (itemId: string, isArchived: boolean) => {
    await archiveProductDb(itemId, isArchived);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, isArchived: isArchived } : i));
  };
  
  const deleteProductPermanently = async (itemId: string) => {
    await deleteProductPermanentlyDb(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }
  
  const addAccessory = async (accessory: Omit<Accessory, 'id' | 'history'>) => {
    const newId = await addAccessoryDb(accessory);
    const newAccessory = await fetchSingleAccessory(newId);
    setAccessories(prev => [...prev, newAccessory]);
  };

  const updateAccessory = async (accessoryId: string, accessoryData: Omit<Accessory, 'id'| 'history'>) => {
    await updateAccessoryDb(accessoryId, accessoryData);
    const updatedAccessory = await fetchSingleAccessory(accessoryId);
    setAccessories(prev => prev.map(acc => acc.id === accessoryId ? updatedAccessory : acc));
  };
  
  const adjustAccessoryStock = async (accessoryId: string, change: number, reason: string) => {
    await adjustAccessoryStockDb(accessoryId, change, reason);
    const updatedAccessory = await fetchSingleAccessory(accessoryId);
    setAccessories(prev => prev.map(acc => acc.id === accessoryId ? updatedAccessory : acc));
  };

  const fetchShippingReceipts = async (options: { page: number; limit: number; channel?: string; salesChannel?: string; date_range?: {from: Date | null, to: Date}; status?: string[]; awb?: string; }) => {
    return await fetchShippingReceiptsDb({ ...options });
  };
  

  const addShippingReceipt = async (receipt: Omit<ShippingReceipt, 'id'>) => {
    const newReceipt = await addShippingReceiptDb(receipt);
    setAllShippingReceipts(prev => [newReceipt, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newReceipt;
  };

  const deleteShippingReceipt = async (id: number) => {
    await deleteShippingReceiptDb(id);
    setAllShippingReceipts(prev => prev.filter(r => r.id !== id));
  };

  const updateShippingReceiptsStatus = async (ids: number[], status: string) => {
    await updateShippingReceiptsDbStatus(ids, status);
    setAllShippingReceipts(prev => prev.map(r => ids.includes(r.id) ? {...r, status} : r));
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

  const clearPosTransactions = async (date: Date) => {
    await clearPosTransactionsDb(date);
  };

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
        cancelSale: revertSale,
        cancelSaleTransaction,
        returnSaleTransaction,
        revertSaleItem,
        getProductBySku,
        allSales,
        resellers,
        addReseller,
        editReseller,
        deleteReseller,
        fetchResellers: () => Promise.resolve(), // No-op as it's part of fetchAllData
        updatePrices,
        archiveProduct,
        deleteProductPermanently,
        accessories,
        addAccessory,
        updateAccessory,
        adjustAccessoryStock,
        allShippingReceipts,
        fetchShippingReceipts,
        addShippingReceipt,
        deleteShippingReceipt,
        updateShippingReceiptsStatus,
        updateShippingReceiptStatus,
        fetchShippingReceiptCounts,
        getReceiptCountByStatus,
        getPendingReceiptsBeforeDate,
        fetchImportHistory: fetchBulkImportHistory,
        deleteImportHistory,
        clearPosTransactions,
        pendingTransaction,
        loadPendingTransaction,
        clearPendingTransaction,
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

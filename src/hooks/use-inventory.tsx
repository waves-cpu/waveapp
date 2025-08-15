'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant } from '@/types';

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: any) => void;
  updateItem: (itemId: string, itemData: any) => void;
  updateStock: (itemId: string, change: number, reason: string) => void;
  getHistory: (itemId: string) => AdjustmentHistory[];
  getItem: (itemId: string) => InventoryItem | InventoryItemVariant | undefined;
  categories: string[];
  bulkUpdateVariants: (itemId: string, variants: InventoryItemVariant[]) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const initialItems: InventoryItem[] = [
  { 
    id: '1', 
    name: 'Organic Green Tea', 
    category: 'Beverages', 
    sku: 'TEA-GRN-ORG',
    imageUrl: 'https://placehold.co/40x40.png',
    variants: [
      { id: '1-1', name: '250g Box', sku: 'TEA-GRN-ORG-250', stock: 150, price: 25000, history: [{ date: new Date(), change: 150, reason: 'Initial Stock', newStockLevel: 150 }] },
      { id: '1-2', name: '500g Pouch', sku: 'TEA-GRN-ORG-500', stock: 80, price: 45000, history: [{ date: new Date(), change: 80, reason: 'Initial Stock', newStockLevel: 80 }] },
    ]
  },
  { 
    id: '2', 
    name: 'Whole Wheat Bread', 
    category: 'Bakery',
    sku: 'BAK-BRD-WW',
    imageUrl: 'https://placehold.co/40x40.png',
    variants: [
        { id: '2-1', name: '500g Loaf', sku: 'BAK-BRD-WW-500', stock: 75, price: 15000, history: [{ date: new Date(), change: 75, reason: 'Initial Stock', newStockLevel: 75 }] }
    ]
  },
  { 
    id: '3', 
    name: 'Almond Milk', 
    category: 'Dairy & Alternatives',
    sku: 'DRY-AMILK',
    imageUrl: 'https://placehold.co/40x40.png',
    variants: [
        { id: '3-1', name: '1L Carton', sku: 'DRY-AMILK-1L', stock: 120, price: 20000, history: [{ date: new Date(), change: 120, reason: 'Initial Stock', newStockLevel: 120 }] }
    ]
  },
  { 
    id: '4', 
    name: 'Avocados', 
    category: 'Produce', 
    stock: 200, 
    price: 10000, 
    size: 'Per piece', 
    history: [{ date: new Date(), change: 200, reason: 'Initial Stock', newStockLevel: 200 }],
    imageUrl: 'https://placehold.co/40x40.png'
  },
  { 
    id: '5', 
    name: 'Quinoa', 
    category: 'Grains', 
    stock: 100, 
    price: 80000, 
    size: '1kg', 
    history: [{ date: new Date(), change: 100, reason: 'Initial Stock', newStockLevel: 100 }],
    imageUrl: 'https://placehold.co/40x40.png'
  },
  { 
    id: '6', 
    name: 'Dark Chocolate Bar', 
    category: 'Snacks', 
    stock: 80, 
    price: 18000, 
    size: '100g', 
    history: [{ date: new Date(), change: 80, reason: 'Initial Stock', newStockLevel: 80 }],
    imageUrl: 'https://placehold.co/40x40.png'
  },
];


export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);

  const addItem = (itemData: any) => {
    const parentId = new Date().getTime().toString();
    
    const newItem: InventoryItem = {
      id: parentId,
      name: itemData.name,
      category: itemData.category,
      sku: itemData.sku,
      imageUrl: itemData.imageUrl || 'https://placehold.co/40x40.png',
    };

    if (itemData.hasVariants && itemData.variants) {
        newItem.variants = itemData.variants.map((variant: any, index: number) => ({
            id: `${parentId}-${index}`,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            history: [{
                date: new Date(),
                change: variant.stock,
                reason: 'Initial Stock',
                newStockLevel: variant.stock
            }]
        }));
    } else {
        newItem.stock = itemData.stock;
        newItem.price = itemData.price;
        newItem.size = itemData.size;
        newItem.history = [{
            date: new Date(),
            change: itemData.stock,
            reason: 'Initial Stock',
            newStockLevel: itemData.stock
        }];
    }

    setItems(prevItems => [...prevItems, newItem]);
  };

  const updateItem = (itemId: string, itemData: any) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
            const updatedItem = {
                ...item,
                ...itemData,
                id: item.id // Ensure ID is not overwritten
            };

            if (itemData.hasVariants && itemData.variants) {
                updatedItem.variants = itemData.variants.map((variant: any, index: number) => {
                    const existingVariant = item.variants?.find(v => v.id === variant.id);
                    if (existingVariant) {
                        const stockChange = variant.stock - existingVariant.stock;
                        let newHistory = existingVariant.history;
                        if (stockChange !== 0) {
                            newHistory = [{
                                date: new Date(),
                                change: stockChange,
                                reason: 'Stock adjustment during edit',
                                newStockLevel: variant.stock
                            }, ...existingVariant.history];
                        }
                        return { ...existingVariant, ...variant, history: newHistory };
                    }
                    // New variant added during edit
                    return {
                        id: `${item.id}-${index}-${new Date().getTime()}`,
                        ...variant,
                        history: [{ date: new Date(), change: variant.stock, reason: 'Initial Stock', newStockLevel: variant.stock }]
                    }
                });
                delete updatedItem.stock;
                delete updatedItem.price;
                delete updatedItem.size;
                delete updatedItem.history;
            } else {
                 const stockChange = itemData.stock - (item.stock || 0);
                 let newHistory = item.history || [];
                 if (stockChange !== 0) {
                     newHistory = [{
                         date: new Date(),
                         change: stockChange,
                         reason: 'Stock adjustment during edit',
                         newStockLevel: itemData.stock
                     }, ...newHistory];
                 }
                updatedItem.stock = itemData.stock;
                updatedItem.price = itemData.price;
                updatedItem.size = itemData.size;
                updatedItem.history = newHistory;
                delete updatedItem.variants;
            }
            return updatedItem;
        }
        return item;
    }));
  };

  const bulkUpdateVariants = (itemId: string, variants: InventoryItemVariant[]) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const newVariants = variants.map(updatedVariant => {
            const originalVariant = item.variants?.find(v => v.id === updatedVariant.id);
            if (originalVariant) {
              const stockChange = updatedVariant.stock - originalVariant.stock;
              let newHistory = originalVariant.history;
              if (stockChange !== 0) {
                newHistory = [{
                  date: new Date(),
                  change: stockChange,
                  reason: 'Bulk Update',
                  newStockLevel: updatedVariant.stock,
                }, ...originalVariant.history];
              }
              return { ...updatedVariant, history: newHistory };
            }
            // This case handles a variant that was somehow newly added in the bulk edit form.
            return { 
                ...updatedVariant,
                history: [{ date: new Date(), change: updatedVariant.stock, reason: 'Initial Stock (Bulk Add)', newStockLevel: updatedVariant.stock }]
            };
          });
          return { ...item, variants: newVariants };
        }
        return item;
      })
    );
  };

  const updateStock = (itemId: string, change: number, reason: string) => {
    setItems(prevItems =>
      prevItems.map(item => {
        // Check if it's a simple item
        if (item.id === itemId && item.stock !== undefined) {
          const newStockLevel = item.stock + change;
          const newHistory: AdjustmentHistory = {
            date: new Date(),
            change,
            reason,
            newStockLevel,
          };
          return {
            ...item,
            stock: newStockLevel,
            history: [newHistory, ...(item.history || [])],
          };
        }
        // Check if it's a variant
        if (item.variants) {
          return {
            ...item,
            variants: item.variants.map(variant => {
              if (variant.id === itemId) {
                const newStockLevel = variant.stock + change;
                const newHistory: AdjustmentHistory = {
                  date: new Date(),
                  change,
                  reason,
                  newStockLevel,
                };
                return {
                  ...variant,
                  stock: newStockLevel,
                  history: [newHistory, ...variant.history],
                };
              }
              return variant;
            })
          };
        }
        return item;
      })
    );
  };
  
  const getHistory = (itemId: string): AdjustmentHistory[] => {
    for (const item of items) {
      if (item.id === itemId) {
        return item.history || [];
      }
      if (item.variants) {
        const variant = item.variants.find(v => v.id === itemId);
        if (variant) {
          return variant.history;
        }
      }
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
          // to edit the whole product, we should return the parent item
          return item; 
        }
      }
    }
    return undefined;
  };
  
  const categories = [...new Set(items.map(item => item.category))].sort();

  return (
    <InventoryContext.Provider value={{ items, addItem, updateItem, bulkUpdateVariants, updateStock, getHistory, getItem, categories }}>
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

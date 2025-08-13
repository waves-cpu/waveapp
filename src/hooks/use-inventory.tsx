"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { InventoryItem, AdjustmentHistory } from '@/types';

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: Omit<InventoryItem, 'id' | 'history'>) => void;
  updateStock: (itemId: string, change: number, reason: string) => void;
  getHistory: (itemId: string) => AdjustmentHistory[];
  getItem: (itemId: string) => InventoryItem | undefined;
  categories: string[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const initialItems: InventoryItem[] = [
  { id: '1', name: 'Organic Green Tea', category: 'Beverages', stock: 150, price: 5, size: '250g', history: [{ date: new Date(), change: 150, reason: 'Initial Stock', newStockLevel: 150 }] },
  { id: '2', name: 'Whole Wheat Bread', category: 'Bakery', stock: 75, price: 3, size: '500g', history: [{ date: new Date(), change: 75, reason: 'Initial Stock', newStockLevel: 75 }] },
  { id: '3', name: 'Almond Milk', category: 'Dairy & Alternatives', stock: 120, price: 4, size: '1L', history: [{ date: new Date(), change: 120, reason: 'Initial Stock', newStockLevel: 120 }] },
  { id: '4', name: 'Avocados', category: 'Produce', stock: 200, price: 2, size: 'Per piece', history: [{ date: new Date(), change: 200, reason: 'Initial Stock', newStockLevel: 200 }] },
  { id: '5', name: 'Quinoa', category: 'Grains', stock: 100, price: 8, size: '1kg', history: [{ date: new Date(), change: 100, reason: 'Initial Stock', newStockLevel: 100 }] },
  { id: '6', name: 'Dark Chocolate Bar', category: 'Snacks', stock: 80, price: 3.5, size: '100g', history: [{ date: new Date(), change: 80, reason: 'Initial Stock', newStockLevel: 80 }] },
];


export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);

  const addItem = (item: Omit<InventoryItem, 'id' | 'history'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: new Date().getTime().toString(),
      history: [{
        date: new Date(),
        change: item.stock,
        reason: 'Initial Stock',
        newStockLevel: item.stock
      }]
    };
    setItems(prevItems => [...prevItems, newItem]);
  };

  const updateStock = (itemId: string, change: number, reason: string) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
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
            history: [newHistory, ...item.history],
          };
        }
        return item;
      })
    );
  };
  
  const getHistory = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item ? item.history : [];
  };

  const getItem = (itemId: string) => {
    return items.find(i => i.id === itemId);
  };
  
  const categories = [...new Set(items.map(item => item.category))].sort();

  return (
    <InventoryContext.Provider value={{ items, addItem, updateStock, getHistory, getItem, categories }}>
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

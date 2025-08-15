'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant } from '@/types';
import { db } from '@/lib/db';

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

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchItems = useCallback(() => {
    const fetchedItems = db.prepare('SELECT * FROM products').all();
    const fetchedVariants = db.prepare('SELECT * FROM variants').all();
    const fetchedHistory = db.prepare('SELECT * FROM history ORDER BY date DESC').all();

    const historyMap = new Map<string, AdjustmentHistory[]>();
    for (const entry of fetchedHistory as any[]) {
        const key = entry.variantId || entry.productId;
        if (!historyMap.has(key)) {
            historyMap.set(key, []);
        }
        historyMap.get(key)!.push({
            ...entry,
            date: new Date(entry.date)
        });
    }

    const variantMap = new Map<string, InventoryItemVariant[]>();
    for (const variant of fetchedVariants as any[]) {
        if (!variantMap.has(variant.productId)) {
            variantMap.set(variant.productId, []);
        }
        variantMap.get(variant.productId)!.push({
            ...variant,
            history: historyMap.get(variant.id) || []
        });
    }

    const fullItems = (fetchedItems as any[]).map(item => {
        if (item.hasVariants) {
            return {
                ...item,
                variants: variantMap.get(item.id) || [],
                imageUrl: item.imageUrl
            };
        }
        return {
            ...item,
            history: historyMap.get(item.id) || [],
            imageUrl: item.imageUrl
        };
    });

    setItems(fullItems);
    const uniqueCategories = [...new Set(fullItems.map(item => item.category))].sort();
    setCategories(uniqueCategories);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);


  const addItem = (itemData: any) => {
    const addProductStmt = db.prepare(`
        INSERT INTO products (name, category, sku, imageUrl, hasVariants, stock, price, size)
        VALUES (@name, @category, @sku, @imageUrl, @hasVariants, @stock, @price, @size)
    `);
    
    const addVariantStmt = db.prepare(`
        INSERT INTO variants (productId, name, sku, price, stock)
        VALUES (@productId, @name, @sku, @price, @stock)
    `);

    const addHistoryStmt = db.prepare(`
        INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
        VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
    `);

    const hasVariants = !!(itemData.hasVariants && itemData.variants && itemData.variants.length > 0);

    const productResult = addProductStmt.run({
        name: itemData.name,
        category: itemData.category,
        sku: itemData.sku || null,
        imageUrl: itemData.imageUrl || 'https://placehold.co/40x40.png',
        hasVariants: hasVariants ? 1 : 0,
        stock: hasVariants ? null : itemData.stock,
        price: hasVariants ? null : itemData.price,
        size: hasVariants ? null : itemData.size,
    });
    
    const productId = productResult.lastInsertRowid as number;

    if (hasVariants) {
        itemData.variants.forEach((variant: any) => {
            const variantResult = addVariantStmt.run({
                productId: productId,
                name: variant.name,
                sku: variant.sku || null,
                price: variant.price,
                stock: variant.stock,
            });
            const variantId = variantResult.lastInsertRowid;
            addHistoryStmt.run({
                productId: productId,
                variantId: variantId,
                change: variant.stock,
                reason: 'Initial Stock',
                newStockLevel: variant.stock,
                date: new Date().toISOString()
            });
        });
    } else {
        addHistoryStmt.run({
            productId: productId,
            variantId: null,
            change: itemData.stock,
            reason: 'Initial Stock',
            newStockLevel: itemData.stock,
            date: new Date().toISOString()
        });
    }
    
    fetchItems();
  };

  const updateItem = (itemId: string, itemData: any) => {
    const updateProductStmt = db.prepare(`
        UPDATE products SET name = @name, category = @category, sku = @sku, imageUrl = @imageUrl, hasVariants = @hasVariants, stock = @stock, price = @price, size = @size
        WHERE id = @id
    `);

    const hasVariants = !!(itemData.hasVariants && itemData.variants && itemData.variants.length > 0);

    // This is a transaction to ensure all or nothing
    db.transaction(() => {
        updateProductStmt.run({
            id: itemId,
            name: itemData.name,
            category: itemData.category,
            sku: itemData.sku || null,
            imageUrl: itemData.imageUrl || 'https://placehold.co/40x40.png',
            hasVariants: hasVariants ? 1 : 0,
            stock: hasVariants ? null : itemData.stock,
            price: hasVariants ? null : itemData.price,
            size: hasVariants ? null : itemData.size,
        });

        if (hasVariants) {
            // Logic for variant updates (add, update, delete)
            const upsertVariantStmt = db.prepare(`
                INSERT INTO variants (id, productId, name, sku, price, stock)
                VALUES (@id, @productId, @name, @sku, @price, @stock)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, sku = excluded.sku, price = excluded.price, stock = excluded.stock
            `);
             const addHistoryStmt = db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
            `);
            const getVariantStockStmt = db.prepare('SELECT stock FROM variants WHERE id = ?');

            itemData.variants.forEach((variant: any) => {
                let stockChange = variant.stock;
                let reason = 'Initial Stock';

                if (variant.id) { // Existing variant
                    const existingVariant = getVariantStockStmt.get(variant.id) as { stock: number } | undefined;
                    if(existingVariant) {
                       stockChange = variant.stock - existingVariant.stock;
                       reason = 'Stock adjustment during edit';
                    }
                }

                const result = upsertVariantStmt.run({
                    id: variant.id || null,
                    productId: itemId,
                    name: variant.name,
                    sku: variant.sku || null,
                    price: variant.price,
                    stock: variant.stock
                });
                
                const variantId = variant.id || result.lastInsertRowid;

                if (stockChange !== 0) {
                     addHistoryStmt.run({
                        productId: itemId,
                        variantId: variantId,
                        change: stockChange,
                        reason: reason,
                        newStockLevel: variant.stock,
                        date: new Date().toISOString()
                    });
                }
            });
            // TODO: Handle deleted variants
        } else {
            // Logic for simple item update
            const getProductStockStmt = db.prepare('SELECT stock FROM products WHERE id = ?');
            const addHistoryStmt = db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
            `);

            const existingProduct = getProductStockStmt.get(itemId) as {stock: number} | undefined;
            const stockChange = itemData.stock - (existingProduct?.stock || 0);

            if (stockChange !== 0) {
                 addHistoryStmt.run({
                    productId: itemId,
                    variantId: null,
                    change: stockChange,
                    reason: 'Stock adjustment during edit',
                    newStockLevel: itemData.stock,
                    date: new Date().toISOString()
                });
            }
        }
    })();
    
    fetchItems();
  };

  const bulkUpdateVariants = (itemId: string, variants: InventoryItemVariant[]) => {
     db.transaction(() => {
        const updateVariantStmt = db.prepare('UPDATE variants SET name = @name, sku = @sku, price = @price, stock = @stock WHERE id = @id');
        const getVariantStockStmt = db.prepare('SELECT stock FROM variants WHERE id = ?');
        const addHistoryStmt = db.prepare(`
            INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
            VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
        `);

        variants.forEach(variant => {
            const originalVariant = getVariantStockStmt.get(variant.id) as { stock: number };
            const stockChange = variant.stock - originalVariant.stock;

            if (stockChange !== 0) {
                 addHistoryStmt.run({
                    productId: itemId,
                    variantId: variant.id,
                    change: stockChange,
                    reason: 'Bulk Update',
                    newStockLevel: variant.stock,
                    date: new Date().toISOString()
                });
            }

            updateVariantStmt.run({
                id: variant.id,
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                stock: variant.stock,
            });
        });
    })();
    fetchItems();
  };

  const updateStock = (itemId: string, change: number, reason: string) => {
    db.transaction(() => {
        const item = items.find(i => i.id === itemId);
        const variant = items.flatMap(i => i.variants || []).find(v => v.id === itemId);

        if (variant) {
            const newStockLevel = variant.stock + change;
            db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
            db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(variant.productId, itemId, change, reason, newStockLevel, new Date().toISOString());

        } else if (item) { // This must be a simple product
            const newStockLevel = (item.stock || 0) + change;
            db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
            db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(itemId, null, change, reason, newStockLevel, new Date().toISOString());
        }
    })();
    fetchItems();
  };
  
  const getHistory = (itemId: string): AdjustmentHistory[] => {
    const simpleItemHistory = db.prepare('SELECT * FROM history WHERE productId = ? AND variantId IS NULL ORDER BY date DESC').all(itemId) as any[];
    if (simpleItemHistory.length > 0) {
        return simpleItemHistory.map(h => ({...h, date: new Date(h.date)}));
    }

    const variantHistory = db.prepare('SELECT * FROM history WHERE variantId = ? ORDER BY date DESC').all(itemId) as any[];
    return variantHistory.map(h => ({...h, date: new Date(h.date)}));
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

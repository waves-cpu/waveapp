
'use server';

import { db } from './db';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale } from '@/types';

export async function fetchInventoryData() {
    const fetchedItems = db.prepare('SELECT * FROM products').all();
    const fetchedVariants = db.prepare('SELECT * FROM variants').all();
    const fetchedHistory = db.prepare('SELECT * FROM history ORDER BY date DESC').all();

    const historyMap = new Map<string, AdjustmentHistory[]>();
    for (const entry of fetchedHistory as any[]) {
        const key = entry.variantId ? entry.variantId.toString() : entry.productId.toString();
        if (!historyMap.has(key)) {
            historyMap.set(key, []);
        }
        historyMap.get(key)!.push({
            ...entry,
            id: entry.id.toString(),
            date: new Date(entry.date)
        });
    }

    const variantMap = new Map<string, InventoryItemVariant[]>();
    for (const variant of fetchedVariants as any[]) {
        const productIdStr = variant.productId.toString();
        if (!variantMap.has(productIdStr)) {
            variantMap.set(productIdStr, []);
        }
        const variantIdStr = variant.id.toString();
        variantMap.get(productIdStr)!.push({
            ...variant,
            id: variantIdStr,
            history: historyMap.get(variantIdStr) || []
        });
    }

    const fullItems: InventoryItem[] = (fetchedItems as any[]).map(item => {
        const itemIdStr = item.id.toString();
        if (item.hasVariants) {
            return {
                ...item,
                id: itemIdStr,
                variants: (variantMap.get(itemIdStr) || []).map(v => ({...v, id: v.id.toString()})),
                imageUrl: item.imageUrl
            };
        }
        return {
            ...item,
            id: itemIdStr,
            history: historyMap.get(itemIdStr) || [],
            imageUrl: item.imageUrl
        };
    });

    const uniqueCategories = [...new Set(fullItems.map(item => item.category))].sort();
    
    return { items: fullItems, categories: uniqueCategories };
}

export async function addProduct(itemData: any) {
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

    db.transaction(() => {
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
                if (variant.stock > 0) {
                    addHistoryStmt.run({
                        productId: productId,
                        variantId: variantId,
                        change: variant.stock,
                        reason: 'Initial Stock',
                        newStockLevel: variant.stock,
                        date: new Date().toISOString()
                    });
                }
            });
        } else {
             if (itemData.stock > 0) {
                addHistoryStmt.run({
                    productId: productId,
                    variantId: null,
                    change: itemData.stock,
                    reason: 'Initial Stock',
                    newStockLevel: itemData.stock,
                    date: new Date().toISOString()
                });
            }
        }
    })();
}

export async function editProduct(itemId: string, itemData: any) {
    const updateProductStmt = db.prepare(`
        UPDATE products SET name = @name, category = @category, sku = @sku, imageUrl = @imageUrl, hasVariants = @hasVariants, stock = @stock, price = @price, size = @size
        WHERE id = @id
    `);

    db.transaction(() => {
        const hasVariants = !!(itemData.hasVariants && itemData.variants && itemData.variants.length > 0);

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

                if (variant.id) {
                    const existingVariant = getVariantStockStmt.get(variant.id) as { stock: number } | undefined;
                    if(existingVariant) {
                       stockChange = variant.stock - existingVariant.stock;
                       reason = stockChange !== 0 ? 'Stock adjustment during edit' : 'No change';
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
        } else {
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
}

export async function editVariantsBulk(itemId: string, variants: InventoryItemVariant[]) {
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
}

export async function adjustStock(itemId: string, change: number, reason: string) {
    if (change === 0) return;

    db.transaction(() => {
        const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(itemId) as (InventoryItemVariant & {productId: number}) | undefined;

        if (variant) {
            const newStockLevel = variant.stock + change;
            db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
            db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(variant.productId, itemId, change, reason, newStockLevel, new Date().toISOString());

        } else { 
            const item = db.prepare('SELECT * FROM products WHERE id = ?').get(itemId) as InventoryItem | undefined;
            if (item && item.stock !== undefined) {
                const newStockLevel = item.stock + change;
                db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
                db.prepare(`
                    INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(itemId, null, change, reason, newStockLevel, new Date().toISOString());
            }
        }
    })();
}

export async function findProductBySku(sku: string): Promise<InventoryItem | null> {
    const getProductBySkuStmt = db.prepare('SELECT * FROM products WHERE sku = ?');
    const getVariantBySkuStmt = db.prepare('SELECT * FROM variants WHERE sku = ?');
    const getProductByIdStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const getVariantsByProductIdStmt = db.prepare('SELECT * FROM variants WHERE productId = ?');

    // First, check if the SKU belongs to a variant
    const variantResult: any = getVariantBySkuStmt.get(sku);
    if (variantResult) {
        // If it's a variant, find its parent product
        const parent = getProductByIdStmt.get(variantResult.productId) as any;
        // Return the parent, but only with the single variant that matched the SKU
        return {
            ...parent,
            id: parent.id.toString(),
            // This structure indicates to the caller that a specific variant was found
            variants: [{...variantResult, id: variantResult.id.toString()}] 
        };
    }

    // If not a variant SKU, check if it's a parent product SKU
    const productResult: any = getProductBySkuStmt.get(sku);
    if (productResult) {
        // If it's a parent product, check if it has variants
        if (productResult.hasVariants) {
            const variants = getVariantsByProductIdStmt.all(productResult.id) as any[];
             // Return the parent with all its variants for selection
            return {
                 ...productResult,
                 id: productResult.id.toString(),
                 variants: variants.map(v => ({ ...v, id: v.id.toString() }))
            };
        }
        // If it's a simple product (no variants), just return it
        return { ...productResult, id: productResult.id.toString() };
    }

    return null;
}


export async function performSale(sku: string, channel: string, quantity: number) {
    const getProductStmt = db.prepare('SELECT id, price, stock FROM products WHERE sku = ? AND hasVariants = 0');
    const getVariantStmt = db.prepare('SELECT id, price, stock, productId FROM variants WHERE sku = ?');
    
    db.transaction(() => {
        const variant = getVariantStmt.get(sku) as { id: number, price: number, stock: number, productId: number } | undefined;
        if (variant) {
            if (variant.stock < quantity) {
                throw new Error('Insufficient stock for variant.');
            }
            adjustStock(variant.id.toString(), -quantity, `Sale (${channel})`);
            db.prepare('INSERT INTO sales (productId, variantId, channel, quantity, priceAtSale, saleDate) VALUES (?, ?, ?, ?, ?, ?)')
              .run(variant.productId, variant.id, channel, quantity, variant.price, new Date().toISOString());
        } else {
            const product = getProductStmt.get(sku) as { id: number, price: number, stock: number } | undefined;
            if (product) {
                 if (product.stock < quantity) {
                    throw new Error('Insufficient stock for product.');
                }
                adjustStock(product.id.toString(), -quantity, `Sale (${channel})`);
                db.prepare('INSERT INTO sales (productId, variantId, channel, quantity, priceAtSale, saleDate) VALUES (?, ?, ?, ?, ?, ?)')
                  .run(product.id, null, channel, quantity, product.price, new Date().toISOString());
            } else {
                throw new Error('Product or variant with specified SKU not found or has variants.');
            }
        }
    })();
}

export async function fetchAllSales(): Promise<Sale[]> {
     const salesQuery = db.prepare(`
        SELECT 
            s.id, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.saleDate,
            p.name as productName,
            v.name as variantName,
            COALESCE(v.sku, p.sku) as sku
        FROM sales s
        JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        ORDER BY s.saleDate DESC
    `);
    
    const sales = salesQuery.all() as any[];
    return sales.map(s => ({...s, id: s.id.toString()}));
}

export async function getSalesByDate(channel: string, date: Date): Promise<Sale[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const salesQuery = db.prepare(`
        SELECT 
            s.id, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.saleDate,
            p.name as productName,
            v.name as variantName,
            COALESCE(v.sku, p.sku) as sku
        FROM sales s
        JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        WHERE s.channel = @channel 
        AND s.saleDate >= @startOfDay 
        AND s.saleDate <= @endOfDay
        ORDER BY s.saleDate DESC
    `);
    
    const sales = salesQuery.all({ 
        channel, 
        startOfDay: startOfDay.toISOString(), 
        endOfDay: endOfDay.toISOString() 
    }) as any[];
    
    return sales.map(s => ({...s, id: s.id.toString()}));
}

export async function revertSale(saleId: string) {
    const getSaleStmt = db.prepare('SELECT * FROM sales WHERE id = ?');
    const deleteSaleStmt = db.prepare('DELETE FROM sales WHERE id = ?');
    
    db.transaction(() => {
        const sale = getSaleStmt.get(saleId) as { id: number, productId: number, variantId?: number, quantity: number, channel: string } | undefined;
        if (!sale) {
            throw new Error('Sale not found.');
        }

        const idToAdjust = sale.variantId ? sale.variantId.toString() : sale.productId.toString();
        
        adjustStock(idToAdjust, sale.quantity, `Cancelled Sale (${sale.channel})`);
        
        deleteSaleStmt.run(saleId);
    })();
}

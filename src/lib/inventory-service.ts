
'use server';

import { db } from './db';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, ChannelPrice, ManualJournalEntry, Accessory, ShippingReceipt } from '@/types';
import { format as formatDate, parseISO, startOfDay, endOfDay } from 'date-fns';

// Settings Functions
export async function saveSetting(key: string, value: any) {
    const valueJson = JSON.stringify(value);
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, valueJson);
}

export async function getSetting<T>(key: string): Promise<T | null> {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (row) {
        return JSON.parse(row.value) as T;
    }
    return null;
}

// Shipping Receipt Functions
export async function fetchShippingReceipts(options: {
    page: number;
    limit: number;
    channel?: string;
    dateString?: string;
    date_range?: { from: Date, to: Date };
    status?: string[];
    awb?: string;
}): Promise<{ receipts: ShippingReceipt[]; total: number }> {
    const { page, limit, channel, dateString, date_range, status, awb } = options;
    const offset = (page - 1) * limit;

    let whereClauses: string[] = [];
    let params: any = {};

    if (channel && channel !== 'all') {
        whereClauses.push("channel = @channel");
        params.channel = channel;
    }
    if (dateString) {
        whereClauses.push("DATE(date) = @dateString");
        params.dateString = dateString;
    }
    if (date_range) {
        whereClauses.push("date BETWEEN @from AND @to");
        params.from = date_range.from.toISOString();
        params.to = date_range.to.toISOString();
    }
    if (status && status.length > 0) {
        whereClauses.push(`status IN (${status.map((_, i) => `@status${i}`).join(',')})`);
        status.forEach((s, i) => {
            params[`status${i}`] = s;
        });
    }
    if (awb) {
        whereClauses.push("awb LIKE @awb");
        params.awb = `%${awb}%`;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const countQuery = db.prepare(`SELECT COUNT(*) as count FROM shipping_receipts ${whereString}`);
    const totalResult = countQuery.get(params) as { count: number };
    const total = totalResult.count;

    const dataQuery = db.prepare(`
        SELECT * FROM shipping_receipts
        ${whereString}
        ORDER BY date DESC, id DESC
        LIMIT @limit OFFSET @offset
    `);
    
    const receipts = dataQuery.all({ ...params, limit, offset }) as any[];
    
    return { receipts, total };
}

export async function fetchShippingReceiptCountsByChannel(dateString: string): Promise<Record<string, number>> {
    const query = db.prepare(`
        SELECT channel, COUNT(*) as count 
        FROM shipping_receipts 
        WHERE DATE(date) = ? AND status = 'Perlu Diproses'
        GROUP BY channel
    `);
    const results = query.all(dateString) as { channel: string, count: number }[];
    const counts: Record<string, number> = {};
    results.forEach(row => {
        counts[row.channel] = row.count;
    });
    return counts;
}


export async function addShippingReceipt(receipt: Omit<ShippingReceipt, 'id'>): Promise<ShippingReceipt> {
    const result = db.prepare('INSERT INTO shipping_receipts (awb, date, channel, status) VALUES (@awb, @date, @channel, @status)').run({
        ...receipt
    });
    
    const newReceipt = db.prepare('SELECT * FROM shipping_receipts WHERE id = ?').get(result.lastInsertRowid) as ShippingReceipt;
    return newReceipt;
}

export async function deleteShippingReceipt(id: number) {
    return db.prepare('DELETE FROM shipping_receipts WHERE id = ?').run(id);
}

export async function updateShippingReceiptsStatus(ids: number[], status: string) {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE shipping_receipts SET status = ? WHERE id IN (${placeholders})`);
    stmt.run(status, ...ids);
}

export async function updateShippingReceiptStatus(id: number, status: string) {
    const stmt = db.prepare(`UPDATE shipping_receipts SET status = ? WHERE id = ?`);
    stmt.run(status, id);
}


// Manual Journal Entry Functions
export async function addManualJournalEntry(entry: Omit<ManualJournalEntry, 'id' | 'type'>) {
    db.prepare(`
        INSERT INTO manual_journal_entries (date, description, debitAccount, creditAccount, amount)
        VALUES (@date, @description, @debitAccount, @creditAccount, @amount)
    `).run({
        date: entry.date,
        description: entry.description,
        debitAccount: entry.debitAccount,
        creditAccount: entry.creditAccount,
        amount: entry.amount
    });
}

export async function fetchManualJournalEntries(): Promise<ManualJournalEntry[]> {
    const entries = db.prepare('SELECT * FROM manual_journal_entries ORDER BY date DESC').all() as any[];
    return entries.map(e => ({
        ...e,
        id: e.id.toString(),
    }));
}

export async function deleteManualJournalEntry(id: string) {
    db.prepare('DELETE FROM manual_journal_entries WHERE id = ?').run(id);
}


export async function fetchInventoryData() {
    const fetchedItems = db.prepare("SELECT * FROM products").all();
    const fetchedAccessories = db.prepare('SELECT * FROM accessories').all();
    const fetchedVariants = db.prepare('SELECT * FROM variants').all();
    const fetchedHistory = db.prepare('SELECT * FROM history ORDER BY date DESC').all();
    const fetchedAccessoryHistory = db.prepare('SELECT * FROM accessory_history ORDER BY date DESC').all();
    const fetchedChannelPrices = db.prepare('SELECT * FROM channel_prices').all() as any[];

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

    const accessoryHistoryMap = new Map<string, AdjustmentHistory[]>();
     for (const entry of fetchedAccessoryHistory as any[]) {
        const key = entry.accessoryId.toString();
        if (!accessoryHistoryMap.has(key)) {
            accessoryHistoryMap.set(key, []);
        }
        accessoryHistoryMap.get(key)!.push({
            ...entry,
            id: entry.id.toString(),
            date: new Date(entry.date)
        });
    }


    const channelPriceMap = new Map<string, ChannelPrice[]>();
    for (const cp of fetchedChannelPrices) {
        const key = cp.variant_id ? cp.variant_id.toString() : cp.product_id.toString();
        if (!channelPriceMap.has(key)) {
            channelPriceMap.set(key, []);
        }
        channelPriceMap.get(key)!.push({
            id: cp.id.toString(),
            channel: cp.channel,
            price: cp.price
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
            history: historyMap.get(variantIdStr) || [],
            channelPrices: channelPriceMap.get(variantIdStr) || [],
        });
    }

    const fullItems: InventoryItem[] = (fetchedItems as any[]).map(item => {
        const itemIdStr = item.id.toString();
        if (item.hasVariants) {
            return {
                ...item,
                id: itemIdStr,
                variants: (variantMap.get(itemIdStr) || []).map(v => ({...v, id: v.id.toString()})),
                imageUrl: item.imageUrl,
            };
        }
        return {
            ...item,
            id: itemIdStr,
            history: historyMap.get(itemIdStr) || [],
            channelPrices: channelPriceMap.get(itemIdStr) || [],
            imageUrl: item.imageUrl,
        };
    });

    const fullAccessories: Accessory[] = (fetchedAccessories as any[]).map(item => {
        const itemIdStr = item.id.toString();
        return {
            ...item,
            id: itemIdStr,
            history: accessoryHistoryMap.get(itemIdStr) || [],
        };
    });

    const uniqueCategories = [...new Set(fullItems.map(item => item.category))].sort();
    
    return { items: fullItems, accessories: fullAccessories, categories: uniqueCategories };
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

export async function bulkAddProducts(data: any[]): Promise<{ addedCount: number; skippedSkus: string[] }> {
    const getProductStmt = db.prepare('SELECT id FROM products WHERE sku = ?');
    const addProductStmt = db.prepare('INSERT INTO products (name, category, sku, imageUrl, hasVariants) VALUES (@name, @category, @sku, @imageUrl, @hasVariants)');
    const addVariantStmt = db.prepare('INSERT INTO variants (productId, name, sku, price, stock, costPrice) VALUES (@productId, @name, @sku, @price, @stock, @costPrice)');
    const updateProductStmt = db.prepare('UPDATE products SET stock = @stock, price = @price, costPrice = @costPrice WHERE id = @id');
    const addHistoryStmt = db.prepare('INSERT INTO history (productId, variantId, change, reason, newStockLevel, date) VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)');

    let addedCount = 0;
    const skippedSkus: string[] = [];

    db.transaction(() => {
        const productGroups = new Map<string, any[]>();

        // Group rows by parent_sku
        data.forEach(row => {
            if (!row.parent_sku) return; // Skip rows without a parent SKU
            if (!productGroups.has(row.parent_sku)) {
                productGroups.set(row.parent_sku, []);
            }
            productGroups.get(row.parent_sku)!.push(row);
        });

        for (const [parentSku, rows] of productGroups.entries()) {
            const existingProduct = getProductStmt.get(parentSku) as { id: number } | undefined;

            if (existingProduct) {
                skippedSkus.push(parentSku);
                continue; // Skip this entire group
            }
            
            addedCount++;
            const firstRow = rows[0];
            const hasVariants = rows.some(r => r.variant_name || r.variant_sku);
            const result = addProductStmt.run({
                name: firstRow.product_name,
                category: firstRow.category,
                sku: parentSku,
                imageUrl: firstRow.image_url || 'https://placehold.co/40x40.png',
                hasVariants: hasVariants ? 1 : 0
            });
            const productId = result.lastInsertRowid as number;
            
            if (rows.some(r => r.variant_name || r.variant_sku)) { // Product with variants
                rows.forEach(row => {
                    const variantResult = addVariantStmt.run({
                        productId: productId,
                        name: row.variant_name,
                        sku: row.variant_sku || null,
                        price: row.price || 0,
                        stock: row.stock || 0,
                        costPrice: row.cost_price || null
                    });
                    const variantId = variantResult.lastInsertRowid as number;
                    if (row.stock > 0) {
                        addHistoryStmt.run({
                            productId: productId,
                            variantId: variantId,
                            change: row.stock,
                            reason: 'Initial Stock (Bulk Import)',
                            newStockLevel: row.stock,
                            date: new Date().toISOString()
                        });
                    }
                });
            } else { // Simple product
                const row = rows[0];
                updateProductStmt.run({
                    id: productId,
                    stock: row.stock || 0,
                    price: row.price || 0,
                    costPrice: row.cost_price || null
                });
                if (row.stock > 0) {
                     addHistoryStmt.run({
                        productId: productId,
                        variantId: null,
                        change: row.stock,
                        reason: 'Initial Stock (Bulk Import)',
                        newStockLevel: row.stock,
                        date: new Date().toISOString()
                    });
                }
            }
        }
    })();
    
    return { addedCount, skippedSkus };
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

export async function editVariantsBulk(itemId: string, variants: InventoryItemVariant[], reason: string) {
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
                    reason: reason,
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
        const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(itemId) as (InventoryItemVariant & {id: number, productId: number}) | undefined;

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


export async function performSale(
    sku: string, 
    channel: string, 
    quantity: number, 
    options?: {
        saleDate?: Date, 
        transactionId?: string, 
        paymentMethod?: string,
        resellerName?: string
    }
) {
    const getProductStmt = db.prepare('SELECT * FROM products WHERE sku = ? AND hasVariants = 0');
    const getVariantStmt = db.prepare('SELECT * FROM variants WHERE sku = ?');
    const getChannelPriceStmt = db.prepare('SELECT price FROM channel_prices WHERE (product_id = @productId OR variant_id = @variantId) AND channel = @channel');
    const ONLINE_CHANNELS = ['shopee', 'tiktok', 'lazada'];
    
    db.transaction(() => {
        // If saleDate is provided, use it. Otherwise, use the current server time.
        // Format it consistently.
        const saleDateString = options?.saleDate ? formatDate(options.saleDate, 'yyyy-MM-dd HH:mm:ss') : formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const saleReason = `Sale (${channel})` + (options?.resellerName ? ` - ${options.resellerName}` : '');

        let priceAtSale;
        let cogsAtSale;
        const variant = getVariantStmt.get(sku) as (InventoryItemVariant & { id: number, productId: number, costPrice?: number }) | undefined;
        
        if (variant) {
            if (variant.stock < quantity) {
                throw new Error('Insufficient stock for variant.');
            }
            
            const isOnlineChannel = ONLINE_CHANNELS.includes(channel);
            
            const onlinePriceResult = getChannelPriceStmt.get({ productId: null, variantId: variant.id, channel: 'shopee' }) as { price: number } | undefined;
            const specificChannelPriceResult = isOnlineChannel ? onlinePriceResult : getChannelPriceStmt.get({ productId: null, variantId: variant.id, channel: channel }) as { price: number } | undefined;

            priceAtSale = specificChannelPriceResult?.price ?? variant.price;
            cogsAtSale = variant.costPrice || 0;

            adjustStock(variant.id.toString(), -quantity, saleReason);
            db.prepare('INSERT INTO sales (transactionId, paymentMethod, resellerName, productId, variantId, channel, quantity, priceAtSale, cogsAtSale, saleDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run(options?.transactionId, options?.paymentMethod, options?.resellerName, variant.productId, variant.id, channel, quantity, priceAtSale, cogsAtSale, saleDateString);
        } else {
            const product = getProductStmt.get(sku) as (InventoryItem & { id: number, costPrice?: number }) | undefined;
            if (product) {
                 if (product.stock! < quantity) {
                    throw new Error('Insufficient stock for product.');
                }
                
                const isOnlineChannel = ONLINE_CHANNELS.includes(channel);

                const onlinePriceResult = getChannelPriceStmt.get({ productId: product.id, variantId: null, channel: 'shopee' }) as { price: number } | undefined;
                const specificChannelPriceResult = isOnlineChannel ? onlinePriceResult : getChannelPriceStmt.get({ productId: product.id, variantId: null, channel: channel }) as { price: number } | undefined;
                
                priceAtSale = specificChannelPriceResult?.price ?? product.price!;
                cogsAtSale = product.costPrice || 0;
                
                adjustStock(product.id.toString(), -quantity, saleReason);
                db.prepare('INSERT INTO sales (transactionId, paymentMethod, resellerName, productId, variantId, channel, quantity, priceAtSale, cogsAtSale, saleDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                  .run(options?.transactionId, options?.paymentMethod, options?.resellerName, product.id, null, channel, quantity, priceAtSale, cogsAtSale, saleDateString);
            } else {
                throw new Error('Product or variant with specified SKU not found or has variants.');
            }
        }
    })();
}

export async function fetchAllSales(): Promise<Sale[]> {
     const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.resellerName, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate,
            p.name as productName,
            v.name as variantName,
            COALESCE(v.sku, p.sku) as sku
        FROM sales s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        ORDER BY s.saleDate DESC, s.id DESC
    `);
    
    const sales = salesQuery.all() as any[];
    return sales.map(s => ({
        ...s, 
        id: s.id.toString(),
        saleDate: s.saleDate, // Keep as string from DB
    }));
}

export async function getSalesByDate(channel: string, date: Date): Promise<Sale[]> {
    const dateString = formatDate(date, 'yyyy-MM-dd');

    const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.resellerName, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate,
            p.name as productName,
            v.name as variantName,
            COALESCE(v.sku, p.sku) as sku
        FROM sales s
        JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        WHERE s.channel = @channel 
        AND date(s.saleDate) = @dateString
        ORDER BY s.id DESC
    `);
    
    const sales = salesQuery.all({ 
        channel, 
        dateString 
    }) as any[];
    
    return sales.map(s => ({
        ...s, 
        id: s.id.toString(),
        saleDate: s.saleDate // Keep as string from DB
    }));
}

export async function revertSale(saleId: string) {
    const getSaleStmt = db.prepare('SELECT * FROM sales WHERE id = ?');
    const deleteSaleStmt = db.prepare('DELETE FROM sales WHERE id = ?');
    
    db.transaction(() => {
        const sale = getSaleStmt.get(saleId) as { id: number, productId: number, variantId?: number, quantity: number, channel: string, resellerName?: string } | undefined;
        if (!sale) {
            throw new Error('Sale not found.');
        }

        const idToAdjust = sale.variantId ? sale.variantId.toString() : sale.productId.toString();
        const reason = `Cancelled Sale (${sale.channel})` + (sale.resellerName ? ` - ${sale.resellerName}` : '');

        adjustStock(idToAdjust, sale.quantity, reason);
        
        deleteSaleStmt.run(saleId);
    })();
}


export async function revertSaleByTransaction(id: string) {
    const isSingleSale = id.startsWith('sale-');

    if (isSingleSale) {
        const saleId = id.replace('sale-', '');
        revertSale(saleId);
    } else {
        const getSalesStmt = db.prepare('SELECT * FROM sales WHERE transactionId = ?');
        const deleteSalesStmt = db.prepare('DELETE FROM sales WHERE transactionId = ?');

        db.transaction(() => {
            const sales = getSalesStmt.all(id) as { id: number, productId: number, variantId?: number, quantity: number, channel: string, resellerName?: string }[];
            if (!sales || sales.length === 0) {
                throw new Error('Transaction not found.');
            }

            sales.forEach(sale => {
                const idToAdjust = sale.variantId ? sale.variantId.toString() : sale.productId.toString();
                const reason = `Cancelled Transaction #${id} (${sale.channel})` + (sale.resellerName ? ` - ${sale.resellerName}` : '');
                adjustStock(idToAdjust, sale.quantity, reason);
            });

            deleteSalesStmt.run(id);
        })();
    }
}

export async function updatePrices(updates: { id: string, type: 'product' | 'variant', costPrice?: number, price?: number, channelPrices?: { channel: string, price?: number }[] }[]) {
    const updateProductStmt = db.prepare('UPDATE products SET costPrice = @costPrice, price = @price WHERE id = @id');
    const updateVariantStmt = db.prepare('UPDATE variants SET costPrice = @costPrice, price = @price WHERE id = @id');
    const addJournalEntryStmt = db.prepare(`
        INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
        VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
    `);
    const upsertChannelPriceStmt = db.prepare(`
        INSERT INTO channel_prices (product_id, variant_id, channel, price)
        VALUES (@productId, @variantId, @channel, @price)
        ON CONFLICT(product_id, variant_id, channel) DO UPDATE SET price = excluded.price
        WHERE excluded.price IS NOT NULL
    `);
    const deleteChannelPriceStmtProduct = db.prepare('DELETE FROM channel_prices WHERE product_id = @id AND channel = @channel');
    const deleteChannelPriceStmtVariant = db.prepare('DELETE FROM channel_prices WHERE variant_id = @id AND channel = @channel');
    
    const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const getVariantStmt = db.prepare('SELECT * FROM variants WHERE id = ?');
    const ONLINE_CHANNELS = ['shopee', 'tiktok', 'lazada'];

    db.transaction(() => {
        updates.forEach(update => {
            const itemBefore: any = update.type === 'product'
                ? getProductStmt.get(update.id)
                : getVariantStmt.get(update.id);
            
            if (!itemBefore) return;

            // Update main cost price and default price
            const finalCostPrice = update.costPrice === undefined || update.costPrice === null ? itemBefore.costPrice : update.costPrice;
            const finalPrice = update.price === undefined || update.price === null ? itemBefore.price : update.price;

            if (update.type === 'product') {
                updateProductStmt.run({ id: update.id, costPrice: finalCostPrice, price: finalPrice });
            } else {
                updateVariantStmt.run({ id: update.id, costPrice: finalCostPrice, price: finalPrice });
            }

            // Journal entry for HPP/COGS adjustment
            const currentStock = itemBefore.stock || 0;
            const oldCostPrice = itemBefore.costPrice ?? 0;
            const newCostPrice = finalCostPrice ?? 0;
            if (oldCostPrice <= 0 && newCostPrice > 0 && currentStock > 0) {
                const totalAssetValue = currentStock * newCostPrice;
                addJournalEntryStmt.run({
                    productId: update.type === 'product' ? itemBefore.id : itemBefore.productId,
                    variantId: update.type === 'variant' ? itemBefore.id : null,
                    change: 0,
                    reason: `Penyesuaian Modal (HPP): Rp${newCostPrice.toLocaleString('id-ID')} x ${currentStock} stok`,
                    newStockLevel: totalAssetValue,
                    date: new Date().toISOString()
                });
            }

            // Handle channel prices
            const onlinePriceInfo = update.channelPrices?.find(p => ONLINE_CHANNELS.includes(p.channel));

            const processChannel = (channel: string, priceInfo: { price?: number } | undefined) => {
                 const priceIsValid = priceInfo && priceInfo.price !== undefined && priceInfo.price !== null && priceInfo.price >= 0;
                 
                 const params = {
                    productId: update.type === 'product' ? update.id : null,
                    variantId: update.type === 'variant' ? update.id : null,
                    channel: channel,
                    price: priceIsValid ? priceInfo.price : null
                 };

                 if (priceIsValid) {
                    upsertChannelPriceStmt.run(params);
                 } else {
                    if (update.type === 'product') {
                        deleteChannelPriceStmtProduct.run({ id: update.id, channel: channel });
                    } else {
                        deleteChannelPriceStmtVariant.run({ id: update.id, channel: channel });
                    }
                 }
            }

            // Process POS and Reseller prices
            processChannel('pos', update.channelPrices?.find(p => p.channel === 'pos'));
            processChannel('reseller', update.channelPrices?.find(p => p.channel === 'reseller'));

            // Process Online prices
            if (onlinePriceInfo) {
                ONLINE_CHANNELS.forEach(channel => {
                    processChannel(channel, onlinePriceInfo);
                });
            }
        });
    })();
}




// Reseller functions
export async function getResellers(): Promise<Reseller[]> {
    return db.prepare('SELECT * FROM resellers ORDER BY name').all() as Reseller[];
}

export async function addReseller(name: string, phone?: string, address?: string) {
    try {
        db.prepare('INSERT INTO resellers (name, phone, address) VALUES (@name, @phone, @address)').run({
            name, 
            phone: phone || null, 
            address: address || null
        });
    } catch(error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            throw new Error('Reseller name already exists.');
        }
        throw error;
    }
}

export async function editReseller(id: number, data: Omit<Reseller, 'id'>) {
     try {
        db.prepare('UPDATE resellers SET name = @name, phone = @phone, address = @address WHERE id = @id').run({
            id,
            name: data.name,
            phone: data.phone || null,
            address: data.address || null
        });
    } catch(error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            throw new Error('Reseller name already exists.');
        }
        throw error;
    }
}

export async function deleteReseller(id: number) {
    db.prepare('DELETE FROM resellers WHERE id = ?').run(id);
}

export async function addAccessory(accessory: Omit<Accessory, 'id' | 'history'>) {
    const addStmt = db.prepare(`
        INSERT INTO accessories (name, sku, category, stock, price, costPrice)
        VALUES (@name, @sku, @category, @stock, @price, @costPrice)
    `);
    const historyStmt = db.prepare(`
        INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel)
        VALUES (?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
        const result = addStmt.run({
            name: accessory.name,
            sku: accessory.sku,
            category: accessory.category,
            stock: accessory.stock,
            price: accessory.price,
            costPrice: accessory.costPrice ?? null,
        });
        const accessoryId = result.lastInsertRowid;
        if (accessory.stock > 0) {
            historyStmt.run(accessoryId, new Date().toISOString(), accessory.stock, 'Initial Stock', accessory.stock);
        }
    })();
}

export async function updateAccessory(accessoryId: string, data: Omit<Accessory, 'id'| 'history'>) {
    const updateStmt = db.prepare(`
        UPDATE accessories SET name = @name, sku = @sku, category = @category, stock = @stock, price = @price, costPrice = @costPrice
        WHERE id = @id
    `);
    const historyStmt = db.prepare(`
        INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel)
        VALUES (?, ?, ?, ?, ?)
    `);
    const getAccessoryStmt = db.prepare('SELECT stock FROM accessories WHERE id = ?');

    db.transaction(() => {
        const existing = getAccessoryStmt.get(accessoryId) as { stock: number };
        const stockChange = data.stock - existing.stock;
        
        updateStmt.run({
             id: accessoryId,
             name: data.name,
             sku: data.sku,
             category: data.category,
             stock: data.stock,
             price: data.price,
             costPrice: data.costPrice ?? null,
        });

        if (stockChange !== 0) {
            historyStmt.run(accessoryId, new Date().toISOString(), stockChange, 'Stock adjustment during edit', data.stock);
        }
    })();
}

export async function adjustAccessoryStock(accessoryId: string, change: number, reason: string) {
    if (change === 0) return;

    db.transaction(() => {
        const getStmt = db.prepare('SELECT stock FROM accessories WHERE id = ?');
        const updateStmt = db.prepare('UPDATE accessories SET stock = ? WHERE id = ?');
        const historyStmt = db.prepare(`
            INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel)
            VALUES (?, ?, ?, ?, ?)
        `);

        const accessory = getStmt.get(accessoryId) as { stock: number };
        if (accessory) {
            const newStockLevel = accessory.stock + change;
            updateStmt.run(newStockLevel, accessoryId);
            historyStmt.run(accessoryId, new Date().toISOString(), change, reason, newStockLevel);
        }
    })();
}

export async function archiveProduct(itemId: string, isArchived: boolean) {
    db.prepare('UPDATE products SET isArchived = ? WHERE id = ?').run(isArchived ? 1 : 0, itemId);
}

export async function deleteProductPermanently(itemId: string) {
    // ON DELETE CASCADE will handle variants, history, and channel_prices
    db.prepare('DELETE FROM products WHERE id = ?').run(itemId);
}

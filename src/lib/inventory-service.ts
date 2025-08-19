

'use server';

import { db } from './db';
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Reseller, ChannelPrice, ManualJournalEntry, ShippingReceipt } from '@/types';

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


export async function fetchInventoryData() {
    const fetchedItems = db.prepare('SELECT * FROM products').all();
    const fetchedVariants = db.prepare('SELECT * FROM variants').all();
    const fetchedHistory = db.prepare('SELECT * FROM history ORDER BY date DESC').all();
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
                imageUrl: item.imageUrl
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
        const saleDate = options?.saleDate || new Date();
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
              .run(options?.transactionId, options?.paymentMethod, options?.resellerName, variant.productId, variant.id, channel, quantity, priceAtSale, cogsAtSale, saleDate.toISOString());
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
                  .run(options?.transactionId, options?.paymentMethod, options?.resellerName, product.id, null, channel, quantity, priceAtSale, cogsAtSale, saleDate.toISOString());
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
            s.id, s.transactionId, s.paymentMethod, s.resellerName, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate,
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

// Shipping Receipt Functions
export async function addShippingReceipt(receiptNumber: string, shippingService: string): Promise<void> {
    try {
        db.prepare(`
            INSERT INTO shipping_receipts (receiptNumber, shippingService, scannedAt)
            VALUES (?, ?, ?)
        `).run(receiptNumber, shippingService, new Date().toISOString());
    } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            throw new Error(`Receipt number ${receiptNumber} has already been scanned.`);
        }
        throw error;
    }
}

export async function fetchShippingReceipts(): Promise<ShippingReceipt[]> {
    const receipts = db.prepare('SELECT * FROM shipping_receipts ORDER BY scannedAt DESC').all() as any[];
    return receipts.map(r => ({
        ...r,
        id: r.id.toString(),
    }));
}

export async function deleteShippingReceipt(id: string): Promise<void> {
    db.prepare('DELETE FROM shipping_receipts WHERE id = ?').run(id);
}

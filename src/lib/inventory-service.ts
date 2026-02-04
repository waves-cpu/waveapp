
import { db as dbProxy } from './db';
const db = dbProxy;
import type { InventoryItem, AdjustmentHistory, InventoryItemVariant, Sale, Accessory, ShippingReceipt, BulkImportHistory, User, ReturnedItem, DiscountGroup, DiscountedProduct, PrintedReceiptCount, ShippingReceiptCounts, Reseller, Employee } from '@/types';
import { categories as allCategories } from '@/types';
import { format as formatDate, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatToWIB } from './utils';
import bcrypt from 'bcryptjs';

// User functions
export async function authenticateUser(username: string, password: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as (User & { password?: string }) | undefined;
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
}

export async function addUser(username: string, password: string): Promise<User> {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
      .run(username, hashedPassword, 'user');
    
    const newUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
    return newUser;
}

export async function fetchAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = db.prepare('SELECT id, username, role FROM users').all() as Omit<User, 'password'>[];
    return users;
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    
    if (result.changes === 0) {
        throw new Error('User not found or password could not be updated.');
    }
}

// Employee Functions
export async function fetchAllEmployees(): Promise<Employee[]> {
    const employees = db.prepare(`
        SELECT 
            e.id, e.userId, e.nikKependudukan, e.nikPekerja, e.fullName, e.division, e.position, e.address, e.startDate,
            u.username, u.role
        FROM employees e
        JOIN users u ON e.userId = u.id
        ORDER BY e.fullName
    `).all() as Employee[];
    return employees;
}

export async function addEmployee(employee: Omit<Employee, 'id' | 'userId' | 'username' | 'role'> & { username: string, password?: string }): Promise<Employee> {
    const transaction = db.transaction(() => {
        if (!employee.password) {
            throw new Error('Password is required for new employees.');
        }

        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(employee.username);
        if (existingUser) {
            throw new Error('Username already exists.');
        }
        
        const hashedPassword = bcrypt.hashSync(employee.password, 10);
        const userResult = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
            .run(employee.username, hashedPassword, 'user');
        const userId = userResult.lastInsertRowid;

        const employeeResult = db.prepare(`
            INSERT INTO employees (userId, fullName, nikKependudukan, nikPekerja, division, position, address, startDate)
            VALUES (@userId, @fullName, @nikKependudukan, @nikPekerja, @division, @position, @address, @startDate)
        `).run({
            userId,
            fullName: employee.fullName,
            nikKependudukan: employee.nikKependudukan,
            nikPekerja: employee.nikPekerja,
            division: employee.division,
            position: employee.position,
            address: employee.address,
            startDate: employee.startDate
        });

        const newEmployeeId = employeeResult.lastInsertRowid;
        const newEmployee = db.prepare(`
            SELECT 
                e.id, e.userId, e.nikKependudukan, e.nikPekerja, e.fullName, e.division, e.position, e.address, e.startDate,
                u.username, u.role
            FROM employees e
            JOIN users u ON e.userId = u.id
            WHERE e.id = ?
        `).get(newEmployeeId) as Employee;

        return newEmployee;
    });

    return transaction();
}

export async function updateEmployee(id: number, employee: Partial<Omit<Employee, 'id'| 'userId' | 'username' | 'role'>>): Promise<Employee> {
    const updateStmt = db.prepare(`
        UPDATE employees SET
            fullName = @fullName,
            nikKependudukan = @nikKependudukan,
            nikPekerja = @nikPekerja,
            division = @division,
            position = @position,
            address = @address,
            startDate = @startDate
        WHERE id = @id
    `);

    updateStmt.run({
        id,
        fullName: employee.fullName,
        nikKependudukan: employee.nikKependudukan,
        nikPekerja: employee.nikPekerja,
        division: employee.division,
        position: employee.position,
        address: employee.address,
        startDate: employee.startDate
    });
    
    const updatedEmployee = db.prepare(`
        SELECT 
            e.id, e.userId, e.nikKependudukan, e.nikPekerja, e.fullName, e.division, e.position, e.address, e.startDate,
            u.username, u.role
        FROM employees e
        JOIN users u ON e.userId = u.id
        WHERE e.id = ?
    `).get(id) as Employee;

    if (!updatedEmployee) {
        throw new Error('Failed to update or find employee.');
    }
    return updatedEmployee;
}


export async function deleteEmployee(id: number): Promise<void> {
    const transaction = db.transaction(() => {
        const employee = db.prepare('SELECT userId FROM employees WHERE id = ?').get(id) as { userId: number } | undefined;
        if (employee) {
            db.prepare('DELETE FROM employees WHERE id = ?').run(id);
            db.prepare('DELETE FROM users WHERE id = ?').run(employee.userId);
        } else {
            throw new Error('Employee not found.');
        }
    });
    transaction();
}

// Reseller Functions
export async function fetchResellers(): Promise<Reseller[]> {
    const resellers = db.prepare('SELECT * FROM resellers ORDER BY name').all() as Reseller[];
    return resellers;
}

export async function addReseller(reseller: Omit<Reseller, 'id' | 'createdAt'>): Promise<Reseller> {
    const result = db.prepare('INSERT INTO resellers (name, phone, address, createdAt) VALUES (?, ?, ?, ?)')
        .run(reseller.name, reseller.phone, reseller.address, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"));
    const newReseller = db.prepare('SELECT * FROM resellers WHERE id = ?').get(result.lastInsertRowid) as Reseller;
    return newReseller;
}

export async function getResellerById(id: number): Promise<Reseller | null> {
    const reseller = db.prepare('SELECT * FROM resellers WHERE id = ?').get(id) as Reseller | undefined;
    return reseller || null;
}

export async function updateReseller(id: number, reseller: Partial<Omit<Reseller, 'id' | 'createdAt'>>): Promise<Reseller> {
    db.prepare('UPDATE resellers SET name = ?, phone = ?, address = ? WHERE id = ?')
        .run(reseller.name, reseller.phone, reseller.address, id);
    const updatedReseller = await getResellerById(id);
    if (!updatedReseller) throw new Error('Failed to update or find reseller.');
    return updatedReseller;
}

export async function deleteReseller(id: number): Promise<void> {
    db.prepare('DELETE FROM resellers WHERE id = ?').run(id);
}


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

// Bulk Import History Functions
export async function addBulkImportHistory(history: Omit<BulkImportHistory, 'id'>): Promise<BulkImportHistory> {
    const result = db.prepare('INSERT INTO bulk_import_history (fileName, date, status, addedSkus, skippedSkus) VALUES (@fileName, @date, @status, @addedSkus, @skippedSkus)')
        .run({
            fileName: history.fileName,
            date: history.date,
            status: history.status,
            addedSkus: history.addedSkus ? JSON.stringify(history.addedSkus) : '[]',
            skippedSkus: history.skippedSkus ? JSON.stringify(history.skippedSkus) : '[]',
        });
    const newHistory = db.prepare('SELECT * FROM bulk_import_history WHERE id = ?').get(result.lastInsertRowid) as BulkImportHistory;
    return { ...newHistory, addedSkus: newHistory.addedSkus ? JSON.parse(newHistory.addedSkus as any) : [], skippedSkus: newHistory.skippedSkus ? JSON.parse(newHistory.skippedSkus as any) : [] };
}


export async function updateBulkImportHistory(id: number, data: Partial<Omit<BulkImportHistory, 'id'>>) {
    let fields = '';
    const params: any = { id };
    if (data.status) { fields += 'status = @status, '; params.status = data.status; }
    if (data.addedCount !== undefined) { fields += 'addedCount = @addedCount, '; params.addedCount = data.addedCount; }
    if (data.skippedCount !== undefined) { fields += 'skippedCount = @skippedCount, '; params.skippedCount = data.skippedCount; }
    if (data.addedSkus) { fields += 'addedSkus = @addedSkus, '; params.addedSkus = JSON.stringify(data.addedSkus); }
    if (data.skippedSkus) { fields += 'skippedSkus = @skippedSkus, '; params.skippedSkus = JSON.stringify(data.skippedSkus); }
    if (data.error) { fields += 'error = @error, '; params.error = data.error; }

    if (fields) {
        fields = fields.slice(0, -2); // remove last ', '
        const stmt = db.prepare(`UPDATE bulk_import_history SET ${fields} WHERE id = @id`);
        stmt.run(params);
    }
}

export async function fetchBulkImportHistory(): Promise<BulkImportHistory[]> {
    const results = db.prepare('SELECT * FROM bulk_import_history ORDER BY date DESC').all() as any[];
    return results.map(row => ({
        ...row,
        addedSkus: row.addedSkus ? JSON.parse(row.addedSkus) : [],
        skippedSkus: row.skippedSkus ? JSON.parse(row.skippedSkus) : [],
    }));
}

export async function deleteBulkImportHistory(id: number) {
    db.prepare('DELETE FROM bulk_import_history WHERE id = ?').run(id);
}


// Printed Receipt Count Functions
export async function addPrintedReceipts(date: string, salesChannel: string, shippingChannel: string, count: number) {
    const existing = db.prepare('SELECT id, count FROM printed_receipt_counts WHERE date = ? AND salesChannel = ? AND shippingChannel = ?').get(date, salesChannel, shippingChannel) as PrintedReceiptCount | undefined;
    if (existing) {
        db.prepare('UPDATE printed_receipt_counts SET count = count + ? WHERE id = ?').run(count, existing.id);
    } else {
        db.prepare('INSERT INTO printed_receipt_counts (date, salesChannel, shippingChannel, count) VALUES (?, ?, ?, ?)').run(date, salesChannel, shippingChannel, count);
    }
}

export async function getPrintedReceiptCountsForDate(date: string): Promise<PrintedReceiptCount[]> {
    return db.prepare('SELECT * FROM printed_receipt_counts WHERE date = ?').all(date) as PrintedReceiptCount[];
}

// Shipping Receipt Functions
export async function fetchShippingReceipts(options: {
    page: number;
    limit: number;
    salesChannel?: string;
    channel?: string;
    dateString?: string;
    date_range?: { from: Date; to: Date };
    status?: string[];
    awb?: string;
    beforeDate?: string;
}): Promise<{ receipts: ShippingReceipt[]; total: number; }> {
    const { page, limit, salesChannel, channel, dateString, date_range, status, awb, beforeDate } = options;
    const offset = (page - 1) * limit;

    let countQueryStr = `SELECT COUNT(*) as count FROM shipping_receipts`;
    let dataQueryStr = `SELECT * FROM shipping_receipts`;
    
    let whereClauses: string[] = [];
    const params: any = {};

    if (awb) {
        whereClauses.push("LOWER(REPLACE(awb, ' ', '')) LIKE LOWER(REPLACE(@awb, ' ', ''))");
        params.awb = `%${awb}%`;
    }
    if (salesChannel) {
        whereClauses.push("salesChannel = @salesChannel");
        params.salesChannel = salesChannel;
    }
    if (channel) {
        whereClauses.push("channel = @channel");
        params.channel = channel;
    }
    if (dateString) {
        whereClauses.push("date(date, 'localtime') = @dateString");
        params.dateString = dateString;
    } else if (date_range) {
        whereClauses.push("date BETWEEN @startDate AND @endDate");
        params.startDate = date_range.from.toISOString();
        params.endDate = date_range.to.toISOString();
    }
    if (beforeDate) {
        whereClauses.push("date(date, 'localtime') < @beforeDate");
        params.beforeDate = beforeDate;
    }
    if (status && status.length > 0) {
        const statusPlaceholders = status.map((s, i) => `@status${i}`);
        whereClauses.push(`status IN (${statusPlaceholders.join(',')})`);
        status.forEach((s, i) => {
            params[`status${i}`] = s;
        });
    }

    if (whereClauses.length > 0) {
        const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
        countQueryStr += whereString;
        dataQueryStr += whereString;
    }

    const countQuery = db.prepare(countQueryStr);
    const totalResult = countQuery.get(params) as { count: number };
    const total = totalResult.count;
    
    dataQueryStr += ` ORDER BY CASE status WHEN 'Perlu Diproses' THEN 0 ELSE 1 END, date DESC, id DESC LIMIT @limit OFFSET @offset`;
    const dataQuery = db.prepare(dataQueryStr);
    
    const queryParams = { ...params, limit, offset };
    const receipts = dataQuery.all(queryParams) as any[];
    
    return { receipts, total };
}

export async function fetchSingleShippingReceipt(id: number): Promise<ShippingReceipt | null> {
    const query = db.prepare('SELECT * FROM shipping_receipts WHERE id = ?');
    const receipt = query.get(id) as ShippingReceipt | undefined;
    return receipt || null;
}

export async function findShippingReceiptByAwb(awb: string): Promise<ShippingReceipt | null> {
    const query = db.prepare('SELECT * FROM shipping_receipts WHERE awb = ?');
    const receipt = query.get(awb) as ShippingReceipt | undefined;
    return receipt || null;
}

export async function getPendingReceiptsBeforeDate(date: Date): Promise<number> {
    const dateString = formatToWIB(date, 'yyyy-MM-dd');
    const query = db.prepare(`
        SELECT COUNT(*) as count
        FROM shipping_receipts
        WHERE status = 'Terproses' AND date(date) < ?
    `);
    const result = query.get(dateString) as { count: number };
    return result.count;
}

export async function fetchShippingReceiptCounts(filters: {
    dateString?: string;
    salesChannel?: string;
    shippingChannel?: string;
    status?: string[];
}): Promise<ShippingReceiptCounts> {
    const { dateString, salesChannel, shippingChannel, status } = filters;

    // --- 1. PENDING COUNTS (Optimasi Query) ---
    let pendingToday = 0;
    let pendingBefore = 0;

    if (dateString) {
        const pendingTodayResult = db.prepare(`
            SELECT COUNT(*) as count FROM shipping_receipts 
            WHERE status = 'Terproses' AND date(date, 'localtime') = ?
        `).get(dateString) as { count: number };
        
        pendingToday = pendingTodayResult?.count || 0;

        const pendingBeforeResult = db.prepare(`
            SELECT COUNT(*) as count FROM shipping_receipts 
            WHERE status = 'Terproses' AND date(date, 'localtime') < ?
        `).get(dateString) as { count: number };
        
        pendingBefore = pendingBeforeResult?.count || 0;
    }

    // --- 2. HELPER BUILD COUNTS (Optimasi Dynamic SQL) ---
    const buildCounts = (groupBy: string, extraGroupBy?: string) => {
        const where: string[] = [];
        const params: any[] = [];
        
        if (dateString) { where.push(`date(date, 'localtime') = ?`); params.push(dateString); }
        if (salesChannel) { where.push('salesChannel = ?'); params.push(salesChannel); }
        if (shippingChannel) { where.push('channel = ?'); params.push(shippingChannel); }
        
        if (Array.isArray(status) && status.length > 0) {
            const statusPlaceholders = status.map(() => `?`).join(',');
            where.push(`status IN (${statusPlaceholders})`);
            params.push(...status);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const selectCols = extraGroupBy ? `${groupBy}, ${extraGroupBy}` : groupBy;

        const query = db.prepare(`
            SELECT ${selectCols}, COUNT(*) as count
            FROM shipping_receipts
            ${whereClause}
            GROUP BY ${selectCols}
        `);

        const results = query.all(...params) as any[];
        
        if (extraGroupBy) {
            const nested: Record<string, Record<string, number>> = {};
            results.forEach(row => {
                const gKey = row[groupBy];
                const sKey = row[extraGroupBy];
                if (gKey && sKey) {
                    if (!nested[gKey]) nested[gKey] = {};
                    nested[gKey][sKey] = row.count;
                }
            });
            return nested;
        } else {
            const simple: Record<string, number> = {};
            results.forEach(row => {
                if (row[groupBy]) simple[row[groupBy]] = row.count;
            });
            return simple;
        }
    };

    const getShippingBySales = () => {
        const where = ["status IN ('Terproses', 'Siap Kirim', 'Selesai')"];
        const params: any[] = [];
        
        if (dateString) {
            where.push(`date(date, 'localtime') = ?`);
            params.push(dateString);
        }

        const results = db.prepare(`
            SELECT salesChannel, channel, COUNT(*) as count
            FROM shipping_receipts
            WHERE ${where.join(' AND ')}
            GROUP BY salesChannel, channel
        `).all(...params) as any[];

        const nested: Record<string, Record<string, number>> = {};
        results.forEach(row => {
            if (!nested[row.salesChannel]) nested[row.salesChannel] = {};
            nested[row.salesChannel][row.channel] = row.count;
        });
        return nested;
    };

    return {
        pendingToday,
        pendingBefore,
        salesChannels: buildCounts('salesChannel', 'channel') as any,
        shippingChannels: buildCounts('channel') as any,
        statuses: buildCounts('status') as any,
        shippingChannelsBySalesChannel: getShippingBySales(),
    };
}

export async function getReceiptCountByStatus(status: string): Promise<Record<string, number>> {
    const query = db.prepare(`
        SELECT channel, COUNT(*) as count
        FROM shipping_receipts
        WHERE status = ?
        GROUP BY channel
    `);
    const results = query.all(status) as { channel: string; count: number }[];
    const counts: Record<string, number> = {};
    results.forEach(row => {
        counts[row.channel] = row.count;
    });
    return counts;
}



export async function addShippingReceipt(receipt: Omit<ShippingReceipt, 'id'>): Promise<ShippingReceipt> {
    try {
        const stmt = db.prepare(`
            INSERT INTO shipping_receipts (awb, channel, salesChannel, status, date, transactionId, userId, username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            receipt.awb,
            receipt.channel,
            receipt.salesChannel,
            receipt.status,
            receipt.date,
            receipt.transactionId,
            receipt.userId,
            receipt.username
        );

        return { id: result.lastInsertRowid as number, ...receipt };
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            const existing = db.prepare('SELECT * from shipping_receipts WHERE awb = ?').get(receipt.awb) as ShippingReceipt;
            if(existing) {
                 const formattedDate = formatToWIB(parseISO(existing.date), 'dd MMM yyyy, HH:mm');
                 throw new Error(`Resi ini sudah diinput di kanal ${existing.salesChannel} pada ${formattedDate}`);
            }
            throw new Error(`DUPLICATE_AWB::AWB ${receipt.awb} sudah ada di database.`);
        }
        throw error;
    }
}

export async function deleteShippingReceipt(id: number) {
    const transaction = db.transaction(() => {
        const receipt = db.prepare('SELECT * FROM shipping_receipts WHERE id = ?').get(id) as ShippingReceipt | undefined;

        if (receipt && receipt.transactionId) {
            // Find sales records to revert stock
            const salesToRevert = db.prepare('SELECT * FROM sales WHERE transactionId = ?').all(receipt.transactionId) as Sale[];
            
            salesToRevert.forEach(sale => {
                // Only revert stock if it's a processed sale that hasn't been completed or cancelled
                if (sale.status && ['Terproses', 'Siap Kirim', 'Diantar'].includes(sale.status)) {
                    const reason = `Deleted Receipt: ${receipt.awb}`;
                    if (sale.variantId) {
                        adjustStock(sale.variantId.toString(), sale.quantity, reason);
                    } else if (sale.productId) {
                        adjustStock(sale.productId.toString(), sale.quantity, reason);
                    } else if (sale.accessoryId) {
                        adjustAccessoryStock(sale.accessoryId.toString(), sale.quantity, reason);
                    }
                }
            });

            // After potentially reverting stock, delete the associated sales records
            db.prepare('DELETE FROM sales WHERE transactionId = ?').run(receipt.transactionId);
        }
        
        // Finally, delete the receipt itself
        const result = db.prepare('DELETE FROM shipping_receipts WHERE id = ?').run(id);
        return result;
    });
    
    return transaction();
}

export async function updateShippingReceiptsStatus(ids: number[], status: string, userId?: number, username?: string) {
    if (ids.length === 0) return;
    
    let query = 'UPDATE shipping_receipts SET status = ?';
    const params: (string | number | null)[] = [status];

    if (userId && username) {
        query += ', userId = ?, username = ?';
        params.push(userId, username);
    }
    
    query += ` WHERE id IN (${ids.map(() => '?').join(',')})`;
    params.push(...ids);

    const stmt = db.prepare(query);
    stmt.run(...params);
}

export async function updateShippingReceiptStatus(id: number, status: string, userId?: number, username?: string) {
    let query = `UPDATE shipping_receipts SET status = ?`;
    const params: (string | number | null)[] = [status];

    if (userId && username) {
        query += ', userId = ?, username = ?';
        params.push(userId, username);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const stmt = db.prepare(query);
    stmt.run(...params);
}


export async function fetchInventoryData() {
    const fetchedItems = db.prepare("SELECT * FROM products").all() as any[];
    const fetchedAccessories = db.prepare('SELECT * FROM accessories').all() as any[];
    const fetchedVariants = db.prepare('SELECT * FROM variants').all() as any[];
    const fetchedHistory = db.prepare('SELECT * FROM history ORDER BY date DESC').all() as any[];
    const fetchedAccessoryHistory = db.prepare('SELECT * FROM accessory_history ORDER BY date DESC').all() as any[];
    const fetchedChannelPrices = db.prepare('SELECT * FROM channel_prices').all() as any[];
    const fetchedDiscountGroups = db.prepare("SELECT * FROM discount_groups").all() as any[];
    const fetchedDiscountedProducts = db.prepare("SELECT * FROM discounted_products").all() as any[];

    const historyMap = new Map<string, AdjustmentHistory[]>();
    for (const entry of fetchedHistory) {
        const key = entry.variantId ? entry.variantId.toString() : entry.productId.toString();
        if (!historyMap.has(key)) {
            historyMap.set(key, []);
        }
        historyMap.get(key)!.push({
            ...entry,
            id: entry.id.toString(),
            date: entry.date
        });
    }

    const accessoryHistoryMap = new Map<string, AdjustmentHistory[]>();
     for (const entry of fetchedAccessoryHistory) {
        const key = entry.accessoryId.toString();
        if (!accessoryHistoryMap.has(key)) {
            accessoryHistoryMap.set(key, []);
        }
        accessoryHistoryMap.get(key)!.push({
            ...entry,
            id: entry.id.toString(),
            date: entry.date
        });
    }


    const channelPriceMap = new Map<string, ChannelPrice[]>();
    for (const cp of fetchedChannelPrices) {
        const key = cp.variant_id ? cp.variant_id.toString() : (cp.product_id ? cp.product_id.toString() : null);
        if (!key) continue;

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
    for (const variant of fetchedVariants) {
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

    const fullItems: InventoryItem[] = fetchedItems.map(item => {
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

    const fullAccessories: Accessory[] = fetchedAccessories.map(item => {
        const itemIdStr = item.id.toString();
        return {
            ...item,
            id: itemIdStr,
            history: accessoryHistoryMap.get(itemIdStr) || [],
        };
    });
    
    const discountProductMap = new Map<number, any[]>();
    fetchedDiscountedProducts.forEach(p => {
        if (!discountProductMap.has(p.groupId)) {
            discountProductMap.set(p.groupId, []);
        }
        discountProductMap.get(p.groupId)!.push(p);
    });

    const fullDiscountGroups = fetchedDiscountGroups.map(g => ({
        ...g,
        products: discountProductMap.get(g.id) || [],
        productCount: (discountProductMap.get(g.id) || []).length
    }));


    const uniqueCategories = [...new Set(fullItems.map(item => item.category))].sort();
    
    return { items: fullItems, accessories: fullAccessories, categories: uniqueCategories, discountGroups: fullDiscountGroups };
}

export async function addProduct(itemData: any): Promise<string> {
    const addProductStmt = db.prepare(`
        INSERT INTO products (name, category, sku, releaseDate, imageUrl, hasVariants, stock, price, size, costPrice)
        VALUES (@name, @category, @sku, @releaseDate, @imageUrl, @hasVariants, @stock, @price, @size, @costPrice)
    `);
    
    const addVariantStmt = db.prepare(`
        INSERT INTO variants (productId, name, sku, price, stock, costPrice)
        VALUES (@productId, @name, @sku, @price, @stock, @costPrice)
    `);

    const addHistoryStmt = db.prepare(`
        INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
        VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
    `);

    const transaction = db.transaction(() => {
        const hasVariants = !!(itemData.hasVariants && itemData.variants && itemData.variants.length > 0);
        
        const productResult = addProductStmt.run({
            name: itemData.name,
            category: itemData.category,
            sku: itemData.sku || null,
            releaseDate: itemData.releaseDate ? new Date(itemData.releaseDate).toISOString() : null,
            imageUrl: itemData.imageUrl || 'https://placehold.co/40x40.png',
            hasVariants: hasVariants ? 1 : 0,
            stock: hasVariants ? null : itemData.stock,
            price: hasVariants ? null : itemData.price,
            size: hasVariants ? null : itemData.size,
            costPrice: hasVariants ? null : itemData.costPrice,
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
                    costPrice: variant.costPrice,
                });
                const variantId = variantResult.lastInsertRowid;
                if (variant.stock > 0) {
                    addHistoryStmt.run({
                        productId: productId,
                        variantId: variantId,
                        change: variant.stock,
                        reason: 'Initial Stock',
                        newStockLevel: variant.stock,
                        date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
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
                    date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
                });
            }
        }
        return productId.toString();
    });

    return transaction();
}

export async function bulkAddProducts(data: any[], fileName: string): Promise<{ addedProducts: {sku: string, name: string}[], skippedProducts: {sku: string, name: string}[] }> {
    const getProductStmt = db.prepare('SELECT id, name FROM products WHERE sku = ?');
    const addProductStmt = db.prepare('INSERT INTO products (name, category, sku, imageUrl, hasVariants) VALUES (@name, @category, @sku, @imageUrl, @hasVariants)');
    const addVariantStmt = db.prepare('INSERT INTO variants (productId, name, sku, price, stock, costPrice) VALUES (@productId, @name, @sku, @price, @stock, @costPrice)');
    const updateProductStmt = db.prepare('UPDATE products SET stock = @stock, price = @price, costPrice = @costPrice WHERE id = @id');
    const addHistoryStmt = db.prepare('INSERT INTO history (productId, variantId, change, reason, newStockLevel, date) VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)');

    const addedProducts: {sku: string, name: string}[] = [];
    const skippedProducts: {sku: string, name: string}[] = [];

    const transaction = db.transaction(() => {
        const productGroups = new Map<string, any[]>();

        data.forEach(row => {
            if (!row.parent_sku) return;
            if (!productGroups.has(row.parent_sku)) {
                productGroups.set(row.parent_sku, []);
            }
            productGroups.get(row.parent_sku)!.push(row);
        });

        for (const [parentSku, rows] of productGroups.entries()) {
            const firstRow = rows[0];
            const existingProduct = getProductStmt.get(parentSku) as { id: number, name: string } | undefined;

            if (existingProduct) {
                skippedProducts.push({ sku: parentSku, name: existingProduct.name });
                continue; 
            }
            
            addedProducts.push({ sku: parentSku, name: firstRow.product_name });
            
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
                            date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
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
                        date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
                    });
                }
            }
        }
    });

    transaction();
    
    return { addedProducts, skippedProducts };
}

export async function bulkUpdateProducts(data: any[]): Promise<{ updatedCount: number; notFoundSkus: string[] }> {
    const getProductStmt = db.prepare('SELECT id FROM products WHERE sku = ?');
    const getVariantStmt = db.prepare('SELECT id FROM variants WHERE sku = ?');
    const updateProductStmt = db.prepare('UPDATE products SET name=@name, category=@category, imageUrl=@imageUrl, price=@price, stock=@stock, costPrice=@costPrice WHERE sku = @parent_sku');
    const updateVariantStmt = db.prepare('UPDATE variants SET name=@name, price=@price, stock=@stock, costPrice=@costPrice WHERE sku = @variant_sku');
    
    const updatedSkus: string[] = [];
    const notFoundSkus: string[] = [];

    db.transaction(() => {
        data.forEach(row => {
            let found = false;
            // Check if it's a variant update
            if (row.variant_sku) {
                const variant = getVariantStmt.get(row.variant_sku) as { id: number } | undefined;
                if (variant) {
                    updateVariantStmt.run({
                        variant_sku: row.variant_sku,
                        name: row.variant_name,
                        price: row.price,
                        stock: row.stock,
                        costPrice: row.cost_price,
                    });
                    updatedSkus.push(row.variant_sku);
                    found = true;
                }
            } 
            // If not a variant or variant not found by SKU, check if it's a simple product update by parent_sku
            else if (row.parent_sku && !row.variant_sku) {
                const product = getProductStmt.get(row.parent_sku) as { id: number } | undefined;
                if (product) {
                     updateProductStmt.run({
                        parent_sku: row.parent_sku,
                        name: row.product_name,
                        category: row.category,
                        imageUrl: row.image_url,
                        price: row.price,
                        stock: row.stock,
                        costPrice: row.cost_price,
                    });
                    updatedSkus.push(row.parent_sku);
                    found = true;
                }
            }

            if (!found) {
                notFoundSkus.push(row.variant_sku || row.parent_sku);
            }
        });
    })();

    return { updatedCount: updatedSkus.length, notFoundSkus: notFoundSkus };
}



export async function editProduct(itemId: string, itemData: any) {
    // If the data is for an accessory, call the specific update function
    if (itemData.type === 'accessory') {
        return updateAccessory(itemId, itemData);
    }
    
    const updateProductStmt = db.prepare(`
        UPDATE products SET name = @name, category = @category, sku = @sku, releaseDate = @releaseDate, imageUrl = @imageUrl, hasVariants = @hasVariants, stock = @stock, price = @price, size = @size, costPrice = @costPrice
        WHERE id = @id
    `);

    db.transaction(() => {
        const hasVariants = !!(itemData.hasVariants && itemData.variants && itemData.variants.length > 0);

        updateProductStmt.run({
            id: itemId,
            name: itemData.name,
            category: itemData.category,
            sku: itemData.sku || null,
            releaseDate: itemData.releaseDate ? new Date(itemData.releaseDate).toISOString() : null,
            imageUrl: itemData.imageUrl || 'https://placehold.co/40x40.png',
            hasVariants: hasVariants ? 1 : 0,
            stock: hasVariants ? null : itemData.stock,
            price: hasVariants ? null : itemData.price,
            size: hasVariants ? null : itemData.size,
            costPrice: hasVariants ? null : itemData.costPrice,
        });

        if (hasVariants) {
            const upsertVariantStmt = db.prepare(`
                INSERT INTO variants (id, productId, name, sku, price, stock, costPrice)
                VALUES (@id, @productId, @name, @sku, @price, @stock, @costPrice)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, sku = excluded.sku, price = excluded.price, stock = excluded.stock, costPrice = excluded.costPrice
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
                    stock: variant.stock,
                    costPrice: variant.costPrice,
                });
                
                const variantId = variant.id || result.lastInsertRowid;

                if (stockChange !== 0) {
                     addHistoryStmt.run({
                        productId: itemId,
                        variantId: variantId,
                        change: stockChange,
                        reason: reason,
                        newStockLevel: variant.stock,
                        date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
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
            if (existingProduct) {
                const stockChange = itemData.stock - (existingProduct.stock || 0);

                if (stockChange !== 0) {
                     addHistoryStmt.run({
                        productId: itemId,
                        variantId: null,
                        change: stockChange,
                        reason: 'Stock adjustment during edit',
                        newStockLevel: itemData.stock,
                        date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
                    });
                }
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
            const originalVariant = getVariantStockStmt.get(variant.id) as { stock: number } | undefined;
            if (originalVariant) {
                const stockChange = variant.stock - originalVariant.stock;

                if (stockChange !== 0) {
                    addHistoryStmt.run({
                        productId: itemId,
                        variantId: variant.id,
                        change: stockChange,
                        reason: reason,
                        newStockLevel: variant.stock,
                        date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
                    });
                }

                updateVariantStmt.run({
                    id: variant.id,
                    name: variant.name,
                    sku: variant.sku,
                    price: variant.price,
                    stock: variant.stock,
                });
            }
        });
    })();
}

export async function adjustStock(itemId: string, change: number, reason: string, userId?: number, username?: string) {
    if (change === 0 && !reason.toLowerCase().includes('penyesuaian modal')) return;

    db.transaction(() => {
        const variant = db.prepare('SELECT * FROM variants WHERE id = ?').get(itemId) as (InventoryItemVariant & {id: number, productId: number}) | undefined;
        
        if (variant) {
            const newStockLevel = variant.stock + change;
            db.prepare('UPDATE variants SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
            db.prepare(`
                INSERT INTO history (productId, variantId, change, reason, newStockLevel, date, userId, username)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(variant.productId, itemId, change, reason, newStockLevel, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"), userId, username);
        } else {
            const item = db.prepare('SELECT * FROM products WHERE id = ?').get(itemId) as (InventoryItem & {id: number}) | undefined;
            if (item && typeof item.stock === 'number') {
                const newStockLevel = item.stock + change;
                db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStockLevel, itemId);
                db.prepare(`
                    INSERT INTO history (productId, variantId, change, reason, newStockLevel, date, userId, username)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(itemId, null, change, reason, newStockLevel, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"), userId, username);
            }
        }
    })();
}

export async function bulkAdjustStock(updates: { itemId: string, quantity: number }[], reason: string, userId?: number, username?: string) {
    const transaction = db.transaction(() => {
        for (const update of updates) {
            adjustStock(update.itemId, update.quantity, reason, userId, username);
        }
    });
    transaction();
}


export async function performSale(
    channel: string, 
    options: {
        sales: { sku: string; quantity: number; priceAtSale: number }[];
        transactionId?: string, 
        paymentMethod?: string,
        status?: string,
        voucherCode?: string;
        resellerId?: number;
        resellerName?: string;
        userId?: number;
        username?: string;
    }
): Promise<{ newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }[]> {
    const { sales, ...saleOptions } = options;

    const getProductStmt = db.prepare('SELECT * FROM products WHERE sku = ? AND hasVariants = 0');
    const getVariantStmt = db.prepare('SELECT * FROM variants WHERE sku = ?');
    const getAccessoryStmt = db.prepare('SELECT * FROM accessories WHERE sku = ?');
    const getParentProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    
    const transaction = db.transaction(() => {
        const results: { newSale: Sale, updatedItem?: InventoryItem, updatedAccessory?: Accessory }[] = [];
        const isAccessoryOnlyTx = sales.every(sale => {
            const accessory = getAccessoryStmt.get(sale.sku);
            return !!accessory;
        });

        if (saleOptions.transactionId && saleOptions.transactionId.startsWith('trans-')) {
            const existingSales = db.prepare('SELECT * FROM sales WHERE transactionId = ? AND status = ?').all(saleOptions.transactionId, 'Pending') as Sale[];
            if (existingSales.length > 0) {
                 db.prepare('DELETE FROM sales WHERE transactionId = ?').run(saleOptions.transactionId);
            }
        }

        if (saleOptions.voucherCode) {
            const voucher = db.prepare('SELECT * FROM discount_groups WHERE voucherCode = ?').get(saleOptions.voucherCode) as DiscountGroup | undefined;
            if (voucher && voucher.maxUses !== null && voucher.maxUses > 0) { 
                db.prepare('UPDATE discount_groups SET maxUses = maxUses - 1 WHERE id = ?').run(voucher.id);
            }
        }
        
        sales.forEach(sale => {
            const saleDateString = formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss");
            
            let saleReason: string;
            let saleStatus: string;
            if (isAccessoryOnlyTx) {
                saleReason = `Pemakaian Aksesoris (POS)`;
                saleStatus = 'Pemakaian Aksesoris';
            } else {
                saleReason = `Sale (${channel})`;
                saleStatus = saleOptions?.status || 'Completed';
            }
            

            let cogsAtSale: number | undefined;
            let parentProduct: InventoryItem | Accessory | undefined;
            let productId: number | null = null;
            let variantId: number | null = null;
            let accessoryId: number | null = null;
            
            const sku = sale.sku;

            const variant = getVariantStmt.get(sku) as (InventoryItemVariant & { id: number, productId: number, costPrice?: number }) | undefined;
            const product = getProductStmt.get(sku) as (InventoryItem & { id: number, costPrice?: number, sku: string }) | undefined;
            const accessory = getAccessoryStmt.get(sku) as (Accessory & { id: number, costPrice?: number, sku: string }) | undefined;
            
            if (variant) {
                parentProduct = getParentProductStmt.get(variant.productId) as InventoryItem | undefined;
                productId = variant.productId;
                variantId = variant.id;
                if (variant.stock < sale.quantity) throw new Error('Insufficient stock for variant.');
                cogsAtSale = variant.costPrice;
                adjustStock(variant.id.toString(), -sale.quantity, saleReason);
            } else if (product) {
                parentProduct = product;
                productId = product.id;
                if (product.stock! < sale.quantity) throw new Error('Insufficient stock for product.');
                cogsAtSale = product.costPrice;
                adjustStock(product.id.toString(), -sale.quantity, saleReason);
            } else if (accessory) {
                accessoryId = accessory.id;
                parentProduct = accessory;
                if (accessory.stock! < sale.quantity) throw new Error('Insufficient stock for accessory.');
                cogsAtSale = accessory.costPrice;
                adjustAccessoryStock(accessory.id.toString(), -sale.quantity, saleReason);
            } else {
                throw new Error('SKU not found or product has variants.');
            }

            const saleResult = db.prepare(`
                INSERT INTO sales (transactionId, paymentMethod, productId, variantId, accessoryId, channel, quantity, priceAtSale, cogsAtSale, saleDate, status, parentSku, productCategory, parentImageUrl, voucherCode, resellerId, resellerName, userId, username)
                VALUES (@transactionId, @paymentMethod, @productId, @variantId, @accessoryId, @channel, @quantity, @priceAtSale, @cogsAtSale, @saleDate, @status, @parentSku, @productCategory, @parentImageUrl, @voucherCode, @resellerId, @resellerName, @userId, @username)
            `).run({
                transactionId: saleOptions?.transactionId || `tx-${Date.now()}`, 
                paymentMethod: saleOptions?.paymentMethod, 
                productId: productId, 
                variantId: variantId, 
                accessoryId: accessoryId,
                channel: channel, 
                quantity: sale.quantity, 
                priceAtSale: sale.priceAtSale, 
                cogsAtSale: cogsAtSale, 
                saleDate: saleDateString, 
                status: saleStatus,
                parentSku: parentProduct?.sku,
                productCategory: parentProduct?.category,
                parentImageUrl: parentProduct?.imageUrl,
                voucherCode: saleOptions.voucherCode || null,
                resellerId: saleOptions.resellerId || null,
                resellerName: saleOptions.resellerName || null,
                userId: saleOptions.userId || null,
                username: saleOptions.username || null,
            });
            
            const newSaleId = saleResult.lastInsertRowid;
            const newSale = db.prepare(`
                SELECT 
                    s.id, s.transactionId, s.paymentMethod, s.productId, s.variantId, s.accessoryId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate, s.voucherCode, s.resellerId, s.resellerName, s.username,
                    COALESCE(p.name, a.name) as productName,
                    p.releaseDate as releaseDate,
                    COALESCE(p.category, a.category) as productCategory,
                    p.imageUrl as parentImageUrl,
                    COALESCE(v.sku, p.sku, a.sku) as sku,
                    COALESCE(p.sku, a.sku) as parentSku,
                    v.name as variantName,
                    s.status
                FROM sales s
                LEFT JOIN products p ON s.productId = p.id
                LEFT JOIN variants v ON s.variantId = v.id
                LEFT JOIN accessories a ON s.accessoryId = a.id
                WHERE s.id = ?
            `).get(newSaleId) as Sale;
            
            results.push({ newSale });
        });

        return results;
    });
    
    return transaction();
}

export async function recordSaleWithReceipt(receiptData: Omit<ShippingReceipt, 'id'>, salesData: Omit<Sale, 'id'>[]) {
    const { awb, userId, username } = receiptData;

    const transaction = db.transaction(() => {
        // Pass userId and username to addShippingReceipt
        addShippingReceipt({ ...receiptData, userId, username });

        salesData.forEach(sale => {
            if (!sale.sku) {
                 throw new Error(`SKU is missing for a sale item in transaction ${sale.transactionId}`);
            }
            const saleReason = `Sale (${sale.channel}) - AWB: ${awb}`;
            
            const getProductStmt = db.prepare('SELECT * FROM products WHERE sku = ? AND hasVariants = 0');
            const getVariantStmt = db.prepare('SELECT * FROM variants WHERE sku = ?');
            const getParentProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
            
            let cogsAtSale: number | undefined;
            let parentProduct: InventoryItem | undefined;
            let productId: number | null = null;
            let variantId: number | null = null;

            const variant = getVariantStmt.get(sale.sku) as (InventoryItemVariant & { id: number, productId: number, costPrice?: number }) | undefined;
            const product = getProductStmt.get(sale.sku) as (InventoryItem & { id: number, costPrice?: number, sku: string }) | undefined;
            
            if (variant) {
                parentProduct = getParentProductStmt.get(variant.productId) as InventoryItem | undefined;
                productId = variant.productId;
                variantId = variant.id;
                if (variant.stock < sale.quantity) throw new Error(`Insufficient stock for variant SKU: ${sale.sku}.`);
                cogsAtSale = variant.costPrice;
                adjustStock(variant.id.toString(), -sale.quantity, saleReason, userId, username);
            } else if (product) {
                parentProduct = product;
                productId = product.id;
                if (product.stock! < sale.quantity) throw new Error(`Insufficient stock for product SKU: ${sale.sku}.`);
                cogsAtSale = product.costPrice;
                adjustStock(product.id.toString(), -sale.quantity, saleReason, userId, username);
            } else {
                throw new Error(`SKU not found for sale item: ${sale.sku}.`);
            }

            db.prepare(`
                INSERT INTO sales (transactionId, productId, variantId, channel, quantity, priceAtSale, cogsAtSale, saleDate, status, parentSku, productCategory, parentImageUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                sale.transactionId, productId, variantId,
                sale.channel, sale.quantity, sale.priceAtSale, cogsAtSale, sale.saleDate,
                'Terproses', parentProduct?.sku, parentProduct?.category, parentProduct?.imageUrl
            );
        });
    });

    return transaction();
}



export async function fetchSingleItem(itemId: string): Promise<InventoryItem> {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(itemId) as any;
    if (!product) {
        const variantParent = db.prepare('SELECT productId FROM variants WHERE id = ?').get(itemId) as { productId: number } | undefined;
        if(variantParent) {
            return fetchSingleItem(variantParent.productId.toString());
        }
        throw new Error('Product not found');
    }
    
    if (product.hasVariants) {
        const variants = db.prepare('SELECT * FROM variants WHERE productId = ?').all(itemId) as any[];
        product.variants = variants.map((v: any) => {
            const history = db.prepare('SELECT * FROM history WHERE variantId = ? ORDER BY date DESC').all(v.id) as any[];
            const channelPrices = db.prepare('SELECT * FROM channel_prices WHERE variant_id = ?').all(v.id) as any[];
            return {
                ...v,
                id: v.id.toString(),
                history: history.map(h => ({...h, id: h.id.toString()})),
                channelPrices: channelPrices.map(cp => ({...cp, id: cp.id.toString()}))
            }
        })
    } else {
        const history = db.prepare('SELECT * FROM history WHERE productId = ? AND variantId IS NULL ORDER BY date DESC').all(itemId) as any[];
        const channelPrices = db.prepare('SELECT * FROM channel_prices WHERE product_id = ?').all(itemId) as any[];
        product.history = history.map(h => ({...h, id: h.id.toString()}));
        product.channelPrices = channelPrices.map(cp => ({...cp, id: cp.id.toString()}));
    }

    product.id = product.id.toString();
    return product as InventoryItem;
}

export async function fetchSingleAccessory(accessoryId: string): Promise<Accessory> {
    const accessory = db.prepare("SELECT * FROM accessories WHERE id = ?").get(accessoryId) as any;
    if (!accessory) {
        throw new Error('Accessory not found');
    }

    const history = db.prepare('SELECT * FROM accessory_history WHERE accessoryId = ? ORDER BY date DESC').all(accessoryId) as any[];
    accessory.history = history.map((h: any) => ({ ...h, id: h.id.toString() }));
    accessory.id = accessory.id.toString();
    return accessory as Accessory;
}


export async function fetchAllSales(): Promise<Sale[]> {
     const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.productId, s.variantId, s.accessoryId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate, s.voucherCode, s.resellerId, s.resellerName, s.username,
            COALESCE(p.name, a.name) as productName,
            p.releaseDate as releaseDate,
            COALESCE(p.category, a.category) as productCategory,
            p.imageUrl as parentImageUrl,
            COALESCE(v.sku, p.sku, a.sku) as sku,
            COALESCE(p.sku, a.sku) as parentSku,
            v.name as variantName,
            s.status
        FROM sales s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        LEFT JOIN accessories a ON s.accessoryId = a.id
        ORDER BY s.saleDate DESC, s.id DESC
    `);
    
    const sales = salesQuery.all() as any[];
    return sales.map(s => ({
        ...s, 
        id: s.id.toString(),
        productId: s.productId?.toString(),
        variantId: s.variantId?.toString(),
        accessoryId: s.accessoryId?.toString(),
        saleDate: s.saleDate,
    }));
}

export async function getPosSalesByDate(date: Date): Promise<Sale[]> {
    const dateString = formatToWIB(date, 'yyyy-MM-dd');
    const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.productId, s.variantId, s.accessoryId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate, s.resellerId, s.resellerName, s.username,
            COALESCE(p.name, a.name) as productName,
            COALESCE(p.category, a.category) as productCategory,
            p.imageUrl as parentImageUrl,
            COALESCE(v.sku, p.sku, a.sku) as sku,
            COALESCE(p.sku, a.sku) as parentSku,
            v.name as variantName,
            s.status
        FROM sales s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        LEFT JOIN accessories a ON s.accessoryId = a.id
        WHERE (s.channel = 'pos' OR s.status = 'Pemakaian Aksesoris')
        AND date(s.saleDate) = ?
        ORDER BY s.saleDate DESC, s.id DESC
    `);
    const sales = salesQuery.all(dateString) as any[];
    return sales.map(s => ({
        ...s,
        id: s.id.toString(),
        saleDate: s.saleDate,
    }));
}


export async function getSalesByTransactionId(transactionId: string): Promise<Sale[]> {
    const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.productId, s.variantId, s.accessoryId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate, s.resellerId, s.resellerName, s.username,
            COALESCE(p.name, a.name) as productName,
            COALESCE(p.category, a.category) as productCategory,
            p.imageUrl as parentImageUrl,
            COALESCE(v.sku, p.sku, a.sku) as sku,
            COALESCE(p.sku, a.sku) as parentSku,
            v.name as variantName,
            s.status
        FROM sales s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        LEFT JOIN accessories a ON s.accessoryId = a.id
        WHERE s.transactionId = ?
        ORDER BY s.id
    `);
    const sales = salesQuery.all(transactionId) as any[];
    return sales.map(s => ({
        ...s, 
        id: s.id.toString(),
        saleDate: s.saleDate,
    }));
}

export async function getSalesByDate(channel: string, date: Date, page: number, limit: number): Promise<{ sales: Sale[], total: number }> {
    const dateString = formatDate(date, 'yyyy-MM-dd');
    const offset = (page - 1) * limit;

    const countQuery = db.prepare(`
        SELECT COUNT(*) as count 
        FROM sales 
        WHERE channel = @channel AND date(saleDate) = @dateString AND status != 'Cancelled'
    `);
    const totalResult = countQuery.get({ channel, dateString }) as { count: number };
    const total = totalResult.count;

    const salesQuery = db.prepare(`
        SELECT 
            s.id, s.transactionId, s.paymentMethod, s.productId, s.variantId, s.channel, s.quantity, s.priceAtSale, s.cogsAtSale, s.saleDate,
            p.name as productName,
            v.name as variantName,
            COALESCE(v.sku, p.sku) as sku,
            s.status
        FROM sales s
        JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        WHERE s.channel = @channel 
        AND date(s.saleDate) = @dateString
        AND s.status != 'Cancelled'
        ORDER BY s.id DESC
        LIMIT @limit OFFSET @offset
    `);
    
    const sales = salesQuery.all({ 
        channel, 
        dateString,
        limit,
        offset
    }) as any[];
    
    const mappedSales = sales.map(s => ({
        ...s, 
        id: s.id.toString(),
        saleDate: s.saleDate // Keep as string from DB
    }));

    return { sales: mappedSales, total };
}

export async function revertSale(saleId: number, newStatus: 'Cancelled' | 'Return Selesai' | 'Return'): Promise<Sale> {
    const getSaleStmt = db.prepare('SELECT * FROM sales WHERE id = ?');
    const updateSaleStatusStmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
    const deleteSaleStmt = db.prepare("DELETE FROM sales WHERE id = ?");

    const transaction = db.transaction(() => {
        const sale = getSaleStmt.get(saleId) as Sale | undefined;
        if (!sale || sale.status === 'Cancelled' || sale.status === 'Return Selesai') {
            throw new Error("Sale already reverted or not found.");
        }
        
        const reason = `${newStatus} Sale: ${sale.transactionId || `ID ${sale.id}`}`;

        if (sale.variantId) {
             adjustStock(sale.variantId.toString(), sale.quantity, reason);
        } else if (sale.productId) {
             adjustStock(sale.productId.toString(), sale.quantity, reason);
        } else if (sale.accessoryId) {
            adjustAccessoryStock(sale.accessoryId.toString(), sale.quantity, reason);
        } else {
            throw new Error("Sale item reference not found.");
        }

        if (newStatus === 'Cancelled') {
            deleteSaleStmt.run(saleId);
            return { ...sale, status: 'Cancelled' }; // Return a representative object
        } else {
            updateSaleStatusStmt.run(newStatus, saleId);
            const updatedSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as Sale;
            return updatedSale;
        }
    });
    
    return transaction();
}

export async function revertSaleItem(transactionId: string, sku: string): Promise<Sale> {
    const getSaleStmt = db.prepare(`
        SELECT s.*
        FROM sales s
        LEFT JOIN variants v ON s.variantId = v.id
        LEFT JOIN products p ON s.productId = p.id
        WHERE s.transactionId = @transactionId 
        AND (v.sku = @sku OR (s.variantId IS NULL AND p.sku = @sku))
        AND s.status = 'Completed'
        ORDER BY s.id DESC
        LIMIT 1
    `);
    
    const sale = getSaleStmt.get({ transactionId, sku }) as Sale | undefined;

    if (sale) {
        return revertSale(Number(sale.id), 'Return Selesai');
    } else {
        throw new Error('Sale item not found in transaction');
    }
}


export async function revertSaleByTransaction(transactionId: string, newStatus: 'Cancelled' | 'Return Selesai' | 'Return'): Promise<Sale[]> {
    const getSalesStmt = db.prepare("SELECT * FROM sales WHERE transactionId = ? AND status NOT IN ('Cancelled', 'Return Selesai')");
    const sales = getSalesStmt.all(transactionId) as Sale[];

    if (!sales || sales.length === 0) {
        return [];
    }

    const transaction = db.transaction(() => {
        const revertedSales: Sale[] = [];
        sales.forEach(async sale => {
            const reverted = revertSale(Number(sale.id), newStatus);
            revertedSales.push(await reverted);
        });
        return revertedSales;
    });

    return transaction();
}

export async function cancelSaleTransaction(transactionId: string) {
    const salesToUpdate = db.prepare("SELECT * FROM sales WHERE transactionId = ?").all(transactionId) as Sale[];
    
    const transaction = db.transaction(() => {
        salesToUpdate.forEach(sale => {
             const reason = `Cancelled Sale: ${sale.transactionId || `ID ${sale.id}`}`;
            // Only revert stock if the sale was in a state that deducted stock
            if (sale.status && ['Completed', 'Pending', 'Siap Kirim', 'Terproses', 'Diantar', 'Pemakaian Aksesoris'].includes(sale.status)) {
                if (sale.variantId) {
                    adjustStock(sale.variantId.toString(), sale.quantity, reason);
                } else if (sale.productId) {
                    adjustStock(sale.productId.toString(), sale.quantity, reason);
                } else if (sale.accessoryId) {
                    adjustAccessoryStock(sale.accessoryId.toString(), sale.quantity, reason);
                }
            }
            // Update status to 'Dibatalkan' instead of deleting
            db.prepare("UPDATE sales SET status = 'Dibatalkan' WHERE id = ?").run(sale.id);
        });
    });

    transaction();
    return salesToUpdate.map(s => ({ ...s, status: 'Dibatalkan' }));
}


export async function returnSaleTransaction(transactionId: string, items?: ReturnedItem[]) {
    const transaction = db.transaction(() => {
        const getSalesStmt = db.prepare("SELECT * FROM sales WHERE transactionId = ? AND status NOT IN ('Cancelled', 'Return Selesai')");
        const salesToReturn = getSalesStmt.all(transactionId) as Sale[];

        if (!salesToReturn || salesToReturn.length === 0) {
            throw new Error('TRANSACTION_NOT_FOUND');
        }

        salesToReturn.forEach(sale => {
            const reason = `Return: ${transactionId}`;
            if (sale.variantId) {
                adjustStock(sale.variantId.toString(), sale.quantity, reason);
            } else if (sale.productId) {
                adjustStock(sale.productId.toString(), sale.quantity, reason);
            } else if (sale.accessoryId) {
                adjustAccessoryStock(sale.accessoryId.toString(), sale.quantity, reason);
            }
            // Update the status of each individual sale record
            db.prepare("UPDATE sales SET status = 'Return Selesai' WHERE id = ?").run(sale.id);
        });
    });

    transaction();
}

export async function clearPosTransactions(date: Date) {
    const dateString = formatToWIB(date, 'yyyy-MM-dd');
    
    const getSalesStmt = db.prepare("SELECT * FROM sales WHERE channel = 'pos' AND strftime('%Y-%m-%d', saleDate) = ?");
    const sales = getSalesStmt.all(dateString) as Sale[];

    if (!sales || sales.length === 0) {
        return;
    }

    const deleteStmt = db.prepare("DELETE FROM sales WHERE id = ?");

    const transaction = db.transaction(() => {
        sales.forEach(sale => {
            const reason = `Txn Cleared: ${sale.transactionId || `ID ${sale.id}`}`;
            
            if (sale.variantId) {
                adjustStock(sale.variantId.toString(), sale.quantity, reason);
            } else if (sale.productId) {
                adjustStock(sale.productId.toString(), sale.quantity, reason);
            } else if (sale.accessoryId) {
                adjustAccessoryStock(sale.accessoryId.toString(), sale.quantity, reason);
            }
            deleteStmt.run(sale.id);
        });
    });

    transaction();
}


function adjustStockByReason(identifier: string, reason: string) {
}

export async function updatePrices(updates: { id: string, type: 'product' | 'variant', costPrice?: number, price?: number, channelPrices?: { channel: string, price?: number }[] }[]) {
    const updateProductStmt = db.prepare('UPDATE products SET costPrice = @costPrice, price = @price WHERE id = @id');
    const updateVariantStmt = db.prepare('UPDATE variants SET costPrice = @costPrice, price = @price WHERE id = @id');
    const addHistoryStmt = db.prepare(`
        INSERT INTO history (productId, variantId, change, reason, newStockLevel, date)
        VALUES (@productId, @variantId, @change, @reason, @newStockLevel, @date)
    `);
    const upsertChannelPriceStmt = db.prepare(`
        INSERT INTO channel_prices (product_id, variant_id, channel, price)
        VALUES (@productId, @variantId, @channel, @price)
        ON CONFLICT(product_id, variant_id, channel) DO UPDATE SET price = excluded.price
    `);
    
    const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const getVariantStmt = db.prepare('SELECT * FROM variants WHERE id = ?');
    
    db.transaction(() => {
        updates.forEach(update => {
            const itemBefore: any = update.type === 'product'
                ? getProductStmt.get(update.id)
                : getVariantStmt.get(update.id);
            
            if (!itemBefore) return;

            const finalCostPrice = update.costPrice === undefined || update.costPrice === null ? itemBefore.costPrice : update.costPrice;
            const finalPrice = update.price === undefined || update.price === null ? itemBefore.price : update.price;

            if (update.type === 'product') {
                updateProductStmt.run({ id: update.id, costPrice: finalCostPrice, price: finalPrice });
            } else {
                updateVariantStmt.run({ id: update.id, costPrice: finalCostPrice, price: finalPrice });
            }

            const currentStock = itemBefore.stock || 0;
            const oldCostPrice = itemBefore.costPrice ?? 0;
            const newCostPrice = finalCostPrice ?? 0;
            if (oldCostPrice <= 0 && newCostPrice > 0 && currentStock > 0) {
                const totalAssetValue = currentStock * newCostPrice;
                addHistoryStmt.run({
                    productId: update.type === 'product' ? itemBefore.id : itemBefore.productId,
                    variantId: update.type === 'variant' ? itemBefore.id : null,
                    change: 0,
                    reason: `Penyesuaian Modal (HPP): Rp${newCostPrice.toLocaleString('id-ID')} x ${currentStock} stok`,
                    newStockLevel: totalAssetValue,
                    date: formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss")
                });
            }

            update.channelPrices?.forEach(channelPrice => {
                const priceIsValid = typeof channelPrice.price === 'number' && channelPrice.price >= 0;

                if (priceIsValid) {
                    if (channelPrice.channel === 'online') {
                        ['shopee', 'tiktok', 'lazada'].forEach(onlineChannel => {
                            upsertChannelPriceStmt.run({
                                productId: update.type === 'product' ? update.id : null,
                                variantId: update.type === 'variant' ? update.id : null,
                                channel: onlineChannel,
                                price: channelPrice.price
                            });
                        });
                    } else {
                        upsertChannelPriceStmt.run({
                            productId: update.type === 'product' ? update.id : null,
                            variantId: update.type === 'variant' ? update.id : null,
                            channel: channelPrice.channel,
                            price: channelPrice.price
                        });
                    }
                }
            });
        });
    })();
}

export async function resetAllPrices() {
}
    
// Discount Group Functions
export async function addDiscountGroup(group: Omit<DiscountGroup, 'id' | 'productCount'>): Promise<void> {
    const transaction = db.transaction(() => {
        const addGroupStmt = db.prepare(`
            INSERT INTO discount_groups (name, category, channel, startDate, endDate, voucherCode, discountType, discountValue, maxUses, minPurchase) 
            VALUES (@name, @category, @channel, @startDate, @endDate, @voucherCode, @discountType, @discountValue, @maxUses, @minPurchase)
        `);
        const addProductStmt = db.prepare('INSERT INTO discounted_products (groupId, productId, variantId, discountedPrice) VALUES (@groupId, @productId, @variantId, @discountedPrice)');
        
        const groupResult = addGroupStmt.run({
            name: group.name,
            category: group.category,
            channel: group.channel,
            startDate: group.startDate,
            endDate: group.endDate,
            voucherCode: group.voucherCode || null,
            discountType: group.discountType || null,
            discountValue: group.discountValue || null,
            maxUses: group.maxUses || null,
            minPurchase: group.minPurchase || null,
        });

        const groupId = groupResult.lastInsertRowid;
        
        if (group.products && group.products.length > 0) {
            group.products.forEach(product => {
                addProductStmt.run({
                    groupId,
                    productId: product.productId,
                    variantId: product.variantId || null,
                    discountedPrice: product.discountedPrice,
                });
            });
        }
    });
    return transaction();
}

export async function editDiscountGroup(id: number, group: Omit<DiscountGroup, 'id' | 'productCount'>): Promise<void> {
    const transaction = db.transaction(() => {
        const updateGroupStmt = db.prepare(`
            UPDATE discount_groups SET 
            name = @name, category = @category, channel = @channel, startDate = @startDate, endDate = @endDate, 
            voucherCode = @voucherCode, discountType = @discountType, discountValue = @discountValue, maxUses = @maxUses, minPurchase = @minPurchase
            WHERE id = @id
        `);
        const deleteProductsStmt = db.prepare('DELETE FROM discounted_products WHERE groupId = ?');
        const addProductStmt = db.prepare('INSERT INTO discounted_products (groupId, productId, variantId, discountedPrice) VALUES (@groupId, @productId, @variantId, @discountedPrice)');

        updateGroupStmt.run({
            id,
            name: group.name,
            category: group.category,
            channel: group.channel,
            startDate: group.startDate,
            endDate: group.endDate,
            voucherCode: group.voucherCode || null,
            discountType: group.discountType || null,
            discountValue: group.discountValue || null,
            maxUses: group.maxUses || null,
            minPurchase: group.minPurchase || null,
        });

        deleteProductsStmt.run(id);

        if (group.products && group.products.length > 0) {
            group.products.forEach(product => {
                addProductStmt.run({
                    groupId: id,
                    productId: product.productId,
                    variantId: product.variantId || null,
                    discountedPrice: product.discountedPrice,
                });
            });
        }
    });
    return transaction();
}

export async function deleteDiscountGroup(id: number): Promise<void> {
    db.prepare('DELETE FROM discount_groups WHERE id = ?').run(id);
}

export async function fetchDiscountGroups(): Promise<DiscountGroup[]> {
    const groups = db.prepare('SELECT * FROM discount_groups ORDER BY name').all() as DiscountGroup[];

    const productsStmt = db.prepare(`
        SELECT 
            dp.groupId, 
            dp.discountedPrice, 
            p.id as productId, 
            v.id as variantId, 
            p.name as productName, 
            v.name as variantName, 
            COALESCE(v.sku, p.sku) as sku, 
            p.imageUrl, 
            COALESCE(v.price, p.price) as originalPrice
        FROM discounted_products dp
        JOIN products p ON dp.productId = p.id
        LEFT JOIN variants v ON dp.variantId = v.id
        WHERE dp.groupId = ?
    `);

    return groups.map(group => {
        const products = group.voucherCode ? [] : productsStmt.all(group.id) as DiscountedProduct[];
        return {
            ...group,
            products,
            productCount: products.length,
        };
    });
}

export async function getDiscountGroup(id: number): Promise<DiscountGroup | null> {
    const group = db.prepare('SELECT * FROM discount_groups WHERE id = ?').get(id) as DiscountGroup | undefined;
    if (!group) return null;

    const products = db.prepare(`
        SELECT 
            dp.discountedPrice, 
            p.id as productId, 
            v.id as variantId, 
            p.name as productName, 
            v.name as variantName, 
            COALESCE(v.sku, p.sku) as sku, 
            p.imageUrl, 
            COALESCE(v.price, p.price) as originalPrice
        FROM discounted_products dp
        JOIN products p ON dp.productId = p.id
        LEFT JOIN variants v ON dp.variantId = v.id
        WHERE dp.groupId = ?
    `).all(id) as DiscountedProduct[];

    return { ...group, products, productCount: products.length };
}

export async function findDiscountGroupByVoucherCode(voucherCode: string, channel: string): Promise<DiscountGroup | null> {
    const now = new Date().toISOString();
    const group = db.prepare(`
        SELECT * FROM discount_groups 
        WHERE lower(voucherCode) = lower(?) AND lower(channel) = lower(?) AND startDate <= ? AND endDate >= ?
    `).get(voucherCode, channel, now, now) as DiscountGroup | undefined;
    
    if (!group) return null;

    const products = db.prepare(`
        SELECT dp.discountedPrice, p.id as productId, v.id as variantId, p.name as productName, v.name as variantName, COALESCE(v.sku, p.sku) as sku, p.imageUrl, COALESCE(v.price, p.price) as originalPrice
        FROM discounted_products dp
        JOIN products p ON dp.productId = p.id
        LEFT JOIN variants v ON dp.variantId = v.id
        WHERE dp.groupId = ?
    `).all(group.id) as DiscountedProduct[];

    return { ...group, products, productCount: products.length };
}

export async function getActiveDiscountPrice(productId: string | number, variantId: string | number | null, category: string, channel: string): Promise<number | null> {
    const now = new Date().toISOString();
    
    const isOnlineSale = ['shopee', 'tiktok', 'lazada'].some(c => channel.toLowerCase().includes(c));

    let channelChecks = [channel.toLowerCase()];
    if (isOnlineSale) {
        channelChecks.push('online');
    }
    const channelPlaceholders = channelChecks.map(() => '?').join(',');

    const getGroupStmt = db.prepare(`
        SELECT id FROM discount_groups 
        WHERE category = ? 
        AND startDate <= ? 
        AND endDate >= ? 
        AND voucherCode IS NULL
        AND lower(channel) IN (${channelPlaceholders})
    `);
    
    const groups = getGroupStmt.all(category, now, now, ...channelChecks) as {id: number}[];

    if (groups.length === 0) return null;

    const groupIds = groups.map(g => g.id);
    const groupPlaceholders = groupIds.map(() => '?').join(',');

    const getDiscountStmt = db.prepare(`
        SELECT dp.discountedPrice
        FROM discounted_products dp
        JOIN discount_groups dg ON dp.groupId = dg.id
        WHERE dp.groupId IN (${groupPlaceholders})
          AND dp.productId = ?
          AND (dp.variantId = ? OR (dp.variantId IS NULL AND ? IS NULL))
        ORDER BY
          CASE 
            WHEN lower(dg.channel) = ? THEN 1 -- Prioritize specific channel
            WHEN lower(dg.channel) = 'online' THEN 2 -- Then 'online' channel
            ELSE 3
          END
        LIMIT 1
    `);
    
    const params: (string|number|null)[] = [...groupIds, productId, variantId ?? null, variantId ?? null, channel.toLowerCase()];
    const result = getDiscountStmt.get(...params) as { discountedPrice: number } | undefined;

    return result ? result.discountedPrice : null;
}

export async function addAccessory(accessory: Omit<Accessory, 'id' | 'history'>): Promise<string> {
    const addStmt = db.prepare(`
        INSERT INTO accessories (name, sku, category, stock, price, costPrice, unit, quantityPerUnit)
        VALUES (@name, @sku, @category, @stock, @price, @costPrice, @unit, @quantityPerUnit)
    `);
    const historyStmt = db.prepare(`
        INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel)
        VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
        const result = addStmt.run({
            name: accessory.name,
            sku: accessory.sku,
            category: accessory.category,
            stock: accessory.stock,
            price: accessory.price,
            costPrice: accessory.costPrice ?? null,
            unit: accessory.unit,
            quantityPerUnit: accessory.quantityPerUnit ?? null
        });
        const accessoryId = result.lastInsertRowid;
        if (accessory.stock > 0) {
            historyStmt.run(accessoryId, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"), accessory.stock, 'Initial Stock', accessory.stock);
        }
        return accessoryId.toString();
    });

    return transaction();
}

export async function updateAccessory(accessoryId: string, data: Omit<Accessory, 'id'| 'history'>) {
    const updateStmt = db.prepare(`
        UPDATE accessories SET name = @name, sku = @sku, category = @category, stock = @stock, price = @price, costPrice = @costPrice, unit = @unit, quantityPerUnit = @quantityPerUnit
        WHERE id = @id
    `);
    const historyStmt = db.prepare(`
        INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel)
        VALUES (?, ?, ?, ?, ?)
    `);
    const getAccessoryStmt = db.prepare('SELECT stock FROM accessories WHERE id = ?');

    db.transaction(() => {
        const existing = getAccessoryStmt.get(accessoryId) as { stock: number } | undefined;
        if (existing) {
            const stockChange = data.stock - existing.stock;
            
            updateStmt.run({
                id: accessoryId,
                name: data.name,
                sku: data.sku,
                category: data.category,
                stock: data.stock,
                price: data.price,
                costPrice: data.costPrice ?? null,
                unit: data.unit,
                quantityPerUnit: data.quantityPerUnit ?? null
            });

            if (stockChange !== 0) {
                historyStmt.run(accessoryId, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"), stockChange, 'Stock adjustment during edit', data.stock);
            }
        }
    })();
}

export async function adjustAccessoryStock(accessoryId: string, change: number, reason: string, userId?: number, username?: string) {
    if (change === 0) return;

    db.transaction(() => {
        const getStmt = db.prepare('SELECT stock FROM accessories WHERE id = ?');
        const updateStmt = db.prepare('UPDATE accessories SET stock = ? WHERE id = ?');
        const historyStmt = db.prepare(`
            INSERT INTO accessory_history (accessoryId, date, change, reason, newStockLevel, userId, username)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const accessory = getStmt.get(accessoryId) as { stock: number } | undefined;
        if (accessory) {
            const newStockLevel = accessory.stock + change;
            updateStmt.run(newStockLevel, accessoryId);
            historyStmt.run(accessoryId, formatToWIB(new Date(), "yyyy-MM-dd HH:mm:ss"), change, reason, newStockLevel, userId, username);
        }
    })();
}

export async function archiveProduct(itemId: string, isArchived: boolean) {
    db.prepare('UPDATE products SET isArchived = ? WHERE id = ?').run(isArchived ? 1 : 0, itemId);
}

export async function deleteProductPermanently(itemId: string) {
    db.transaction(() => {
        const variantIds = db.prepare('SELECT id FROM variants WHERE productId = ?').all(itemId) as { id: number }[];

        if (variantIds.length > 0) {
            const variantIdList = variantIds.map((v: any) => v.id);
            const variantPlaceholders = variantIdList.map(() => '?').join(',');

            if (variantIdList.length > 0) {
                db.prepare(`DELETE FROM sales WHERE variantId IN (${variantPlaceholders})`).run(...variantIdList);
                db.prepare(`DELETE FROM history WHERE variantId IN (${variantPlaceholders})`).run(...variantIdList);
                db.prepare(`DELETE FROM channel_prices WHERE variant_id IN (${variantPlaceholders})`).run(...variantIdList);
                db.prepare(`DELETE FROM discounted_products WHERE variantId IN (${variantPlaceholders})`).run(...variantIdList);
            }
        }

        db.prepare('DELETE FROM sales WHERE productId = ? AND variantId IS NULL').run(itemId);
        db.prepare('DELETE FROM history WHERE productId = ? AND variantId IS NULL').run(itemId);
        db.prepare('DELETE FROM channel_prices WHERE product_id = ? AND variant_id IS NULL').run(itemId);
        db.prepare('DELETE FROM discounted_products WHERE productId = ? AND variantId IS NULL').run(itemId);
        
        // After cleaning up dependencies, delete the product itself
        db.prepare('DELETE FROM variants WHERE productId = ?').run(itemId);
        db.prepare('DELETE FROM products WHERE id = ?').run(itemId);
    })();
}

async function updateShippingReceiptStatusByAwb(awb: string, status: string) {
    const stmt = db.prepare(`UPDATE shipping_receipts SET status = ? WHERE awb = ?`);
    stmt.run(status, awb);
}


export async function checkPrintedReceiptAvailability(salesChannel: string, shippingChannel: string, date: string): Promise<boolean> {
    const printedCountRow = db.prepare(`
        SELECT SUM(count) as totalPrinted
        FROM printed_receipt_counts
        WHERE date = ? AND salesChannel = ? AND shippingChannel = ?
    `).get(date, salesChannel, shippingChannel) as { totalPrinted: number | null } | undefined;

    const printedCount = printedCountRow?.totalPrinted || 0;

    const usedCountRow = db.prepare(`
        SELECT COUNT(*) as totalUsed
        FROM shipping_receipts
        WHERE date(date) = ? AND salesChannel = ? AND channel = ?
    `).get(date, salesChannel, shippingChannel) as { totalUsed: number };

    const usedCount = usedCountRow.totalUsed;
    
    return usedCount < printedCount;
}

export async function getVoucherUsageAnalytics(groupId: number) {
    const group = db.prepare('SELECT * FROM discount_groups WHERE id = ?').get(groupId) as DiscountGroup | undefined;
    if (!group || !group.voucherCode) {
        throw new Error('Voucher not found.');
    }

    const sales = db.prepare(`
        SELECT 
            transactionId, 
            channel,
            resellerName,
            saleDate, 
            SUM(priceAtSale * quantity) as totalSale
        FROM sales 
        WHERE voucherCode = ? 
        GROUP BY transactionId, channel, saleDate, resellerName
        ORDER BY saleDate DESC
    `).all(group.voucherCode) as { transactionId: string; channel: string; resellerName: string | null; saleDate: string; totalSale: number }[];

    const totalDiscountResult = db.prepare(`
        SELECT 
            SUM(s.quantity * (COALESCE(v.price, p.price) - s.priceAtSale)) as totalDiscount
        FROM sales s
        LEFT JOIN products p ON s.productId = p.id
        LEFT JOIN variants v ON s.variantId = v.id
        WHERE s.voucherCode = ?
    `).get(group.voucherCode) as { totalDiscount: number } | undefined;

    const totalDiscount = totalDiscountResult?.totalDiscount || 0;
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalSale, 0);

    return {
        voucher: group,
        usageCount: sales.length,
        totalDiscount,
        totalRevenue,
        transactions: sales
    };
}
    

    

















    







    




    


    

    




























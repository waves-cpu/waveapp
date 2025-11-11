
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'waves.db');

let db: Database.Database;

try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
} catch (error) {
    console.error('Failed to open database, possibly corrupt. Deleting and recreating.', error);
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
}


const runMigrations = () => {
  try {
    db.exec("UPDATE products SET sku = SUBSTR(sku, 1, LENGTH(sku) - 2) WHERE sku LIKE '%.0'");
    db.exec("UPDATE variants SET sku = SUBSTR(sku, 1, LENGTH(sku) - 2) WHERE sku LIKE '%.0'");

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_prices'").get();
    if (tables) {
        const channelPricesColumns = db.pragma('table_info(channel_prices)');
        const hasProductId = channelPricesColumns.some((col: any) => col.name === 'product_id');
        const hasVariantId = channelPricesColumns.some((col: any) => col.name === 'variant_id');
        
        if (!hasProductId || !hasVariantId) {
            console.log('Incorrect schema detected for channel_prices. Recreating table...');
            db.exec('DROP TABLE IF EXISTS channel_prices');
            db.exec(`
                 CREATE TABLE channel_prices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    variant_id INTEGER,
                    channel TEXT NOT NULL,
                    price REAL NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
                    FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE CASCADE,
                    UNIQUE (product_id, variant_id, channel)
                );
            `);
             console.log('Table channel_prices recreated successfully.');
        }
    }


    const salesColumns = db.pragma('table_info(sales)');
    const hasTransactionId = salesColumns.some((col: any) => col.name === 'transactionId');
    const hasPaymentMethod = salesColumns.some((col: any) => col.name === 'paymentMethod');
    const hasResellerName = salesColumns.some((col: any) => col.name === 'resellerName');
    const hasCogs = salesColumns.some((col: any) => col.name === 'cogsAtSale');
    const hasParentSku = salesColumns.some((col: any) => col.name === 'parentSku');
    const hasStatus = salesColumns.some((col: any) => col.name === 'status');


    if (!hasTransactionId) {
      db.exec('ALTER TABLE sales ADD COLUMN transactionId TEXT');
    }
    
    if (!hasPaymentMethod) {
      db.exec('ALTER TABLE sales ADD COLUMN paymentMethod TEXT');
    }
    
    if (!hasResellerName) {
        db.exec('ALTER TABLE sales ADD COLUMN resellerName TEXT');
    }
    
    if (!hasCogs) {
        db.exec('ALTER TABLE sales ADD COLUMN cogsAtSale REAL');
    }
    
    if (!hasParentSku) {
        db.exec('ALTER TABLE sales ADD COLUMN parentSku TEXT');
    }
    
    if (!hasStatus) {
        db.exec("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'Completed'");
    }

    const resellerColumns = db.pragma('table_info(resellers)');
    const hasPhone = resellerColumns.some((col: any) => col.name === 'phone');
    const hasAddress = resellerColumns.some((col: any) => col.name === 'address');

    if(!hasPhone) {
        db.exec('ALTER TABLE resellers ADD COLUMN phone TEXT');
    }
    if(!hasAddress) {
        db.exec('ALTER TABLE resellers ADD COLUMN address TEXT');
    }

    const productColumns = db.pragma('table_info(products)');
    if (!productColumns.some((col: any) => col.name === 'costPrice')) {
        db.exec('ALTER TABLE products ADD COLUMN costPrice REAL');
    }
     if (!productColumns.some((col: any) => col.name === 'isArchived')) {
        db.exec('ALTER TABLE products ADD COLUMN isArchived INTEGER DEFAULT 0');
    }
    if (!productColumns.some((col: any) => col.name === 'releaseDate')) {
        db.exec('ALTER TABLE products ADD COLUMN releaseDate TEXT');
    }


    const variantColumns = db.pragma('table_info(variants)');
    if (!variantColumns.some((col: any) => col.name === 'costPrice')) {
        db.exec('ALTER TABLE variants ADD COLUMN costPrice REAL');
    }

    const accessoryColumns = db.pragma('table_info(accessories)');
    if (accessoryColumns && !accessoryColumns.some((col: any) => col.name === 'costPrice')) {
        db.exec('ALTER TABLE accessories ADD COLUMN costPrice REAL');
    }
    if (accessoryColumns && !accessoryColumns.some((col: any) => col.name === 'category')) {
        db.exec('ALTER TABLE accessories ADD COLUMN category TEXT');
    }
    
    const salesColumnsForBackfill = db.pragma('table_info(sales)');
    if (salesColumnsForBackfill.some((col: any) => col.name === 'parentSku')) {
        const stmt = db.prepare(`
            UPDATE sales
            SET parentSku = (SELECT sku FROM products WHERE products.id = sales.productId)
            WHERE parentSku IS NULL AND productId IS NOT NULL
        `);
        stmt.run();
    }
    
    const shippingReceiptColumns = db.pragma('table_info(shipping_receipts)');
    if (shippingReceiptColumns && !shippingReceiptColumns.some((col: any) => col.name === 'transactionId')) {
        db.exec('ALTER TABLE shipping_receipts ADD COLUMN transactionId TEXT');
    }
    
    const receiptsToUpdate = db.prepare('SELECT id, awb FROM shipping_receipts WHERE transactionId IS NULL OR transactionId = ""').all();
    if (receiptsToUpdate.length > 0) {
        const updateStmt = db.prepare('UPDATE shipping_receipts SET transactionId = ? WHERE id = ?');
        db.transaction(() => {
            for (const receipt of receiptsToUpdate as any[]) {
                updateStmt.run(receipt.awb, receipt.id);
            }
        })();
    }

    // Drop manual_journal_entries if it exists
    const journalTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='manual_journal_entries'").get();
    if (journalTable) {
        db.exec('DROP TABLE manual_journal_entries');
    }


  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table:')) {
    } else {
        console.error('Migration failed:', error);
    }
  }
};


const createSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT,
      releaseDate TEXT,
      imageUrl TEXT,
      hasVariants BOOLEAN NOT NULL DEFAULT 0,
      isArchived INTEGER DEFAULT 0,
      stock INTEGER,
      price REAL,
      costPrice REAL,
      size TEXT
    );

    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL NOT NULL,
      costPrice REAL,
      stock INTEGER NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

     CREATE TABLE IF NOT EXISTS accessories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT,
        category TEXT,
        stock INTEGER NOT NULL,
        price REAL,
        costPrice REAL
    );

     CREATE TABLE IF NOT EXISTS accessory_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accessoryId INTEGER NOT NULL,
        date TEXT NOT NULL,
        change INTEGER NOT NULL,
        reason TEXT NOT NULL,
        newStockLevel INTEGER NOT NULL,
        FOREIGN KEY (accessoryId) REFERENCES accessories(id) ON DELETE CASCADE
    );

     CREATE TABLE IF NOT EXISTS channel_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        variant_id INTEGER,
        channel TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE CASCADE,
        UNIQUE (product_id, variant_id, channel)
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      variantId INTEGER,
      date TEXT NOT NULL,
      change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      newStockLevel INTEGER NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variantId) REFERENCES variants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionId TEXT,
        paymentMethod TEXT,
        resellerName TEXT,
        productId INTEGER,
        variantId INTEGER,
        accessoryId INTEGER,
        parentSku TEXT,
        channel TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtSale REAL NOT NULL,
        cogsAtSale REAL,
        saleDate TEXT NOT NULL,
        status TEXT DEFAULT 'Completed',
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (variantId) REFERENCES variants(id),
        FOREIGN KEY (accessoryId) REFERENCES accessories(id)
    );

     CREATE TABLE IF NOT EXISTS resellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shipping_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        awb TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        transactionId TEXT
    );

    CREATE TABLE IF NOT EXISTS bulk_import_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        addedCount INTEGER,
        skippedCount INTEGER,
        addedSkus TEXT,
        skippedSkus TEXT,
        error TEXT
    );
  `);
};

createSchema();
runMigrations();


const seedData = () => {
    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
        if (userCount.count === 0) {
            // NOTE: Storing plain text passwords is a major security risk.
            // This is for demonstration purposes only. Use a hashing library like bcrypt in production.
            db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
              .run('admin', 'admin123', 'admin');
        }

        const receiptCount = db.prepare('SELECT COUNT(*) as count FROM shipping_receipts').get() as { count: number };
        if (receiptCount.count === 0) {
             const mockReceipts = [
              { awb: 'SPXID0123456789A', date: '2024-08-01 10:00:00', channel: 'Shopee', status: 'Dikirim' },
              { awb: 'SPXID0123456789B', date: '2024-08-01 11:00:00', channel: 'Shopee', status: 'Perlu Diproses' },
              { awb: 'JP1234567890', date: '2024-07-31 15:00:00', channel: 'Tokopedia', status: 'Selesai' },
            ];

            const insert = db.prepare('INSERT INTO shipping_receipts (awb, date, channel, status) VALUES (@awb, @date, @channel, @status)');

            db.transaction(() => {
                for (const receipt of mockReceipts) {
                    try { insert.run(receipt); } catch (e) {}
                }
            })();
        }

    } catch (e) {
        // console.error("Seeding failed", e);
    }
};

seedData();

export { db };

    
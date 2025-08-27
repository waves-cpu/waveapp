

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'inventory.db');

// One-time fix: Delete the potentially corrupt database file.
// This will be removed in the next interaction.
if (fs.existsSync(dbPath)) {
    console.log('Corrupt database file found. Deleting and recreating...');
    fs.unlinkSync(dbPath);
    console.log('Old database file deleted.');
}


export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Simple migration logic
const runMigrations = () => {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_prices'").get();
    if (tables) {
        const channelPricesColumns = db.pragma('table_info(channel_prices)');
        const hasProductId = channelPricesColumns.some((col: any) => col.name === 'product_id');
        const hasVariantId = channelPricesColumns.some((col: any) => col.name === 'variant_id');
        
        // This is a simple migration strategy for this specific problem.
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

    if (!hasTransactionId) {
      console.log('Adding transactionId column to sales table...');
      db.exec('ALTER TABLE sales ADD COLUMN transactionId TEXT');
    }
    
    if (!hasPaymentMethod) {
      console.log('Adding paymentMethod column to sales table...');
      db.exec('ALTER TABLE sales ADD COLUMN paymentMethod TEXT');
    }
    
    if (!hasResellerName) {
        console.log('Adding resellerName column to sales table...');
        db.exec('ALTER TABLE sales ADD COLUMN resellerName TEXT');
    }
    
    if (!hasCogs) {
        console.log('Adding cogsAtSale column to sales table...');
        db.exec('ALTER TABLE sales ADD COLUMN cogsAtSale REAL');
    }

    const resellerColumns = db.pragma('table_info(resellers)');
    const hasPhone = resellerColumns.some((col: any) => col.name === 'phone');
    const hasAddress = resellerColumns.some((col: any) => col.name === 'address');

    if(!hasPhone) {
        console.log('Adding phone column to resellers table...');
        db.exec('ALTER TABLE resellers ADD COLUMN phone TEXT');
    }
    if(!hasAddress) {
        console.log('Adding address column to resellers table...');
        db.exec('ALTER TABLE resellers ADD COLUMN address TEXT');
    }

    // Add costPrice to products and variants
    const productColumns = db.pragma('table_info(products)');
    if (!productColumns.some((col: any) => col.name === 'costPrice')) {
        console.log('Adding costPrice column to products table...');
        db.exec('ALTER TABLE products ADD COLUMN costPrice REAL');
    }
     if (!productColumns.some((col: any) => col.name === 'isArchived')) {
        console.log('Adding isArchived column to products table...');
        db.exec('ALTER TABLE products ADD COLUMN isArchived INTEGER DEFAULT 0');
    }


    const variantColumns = db.pragma('table_info(variants)');
    if (!variantColumns.some((col: any) => col.name === 'costPrice')) {
        console.log('Adding costPrice column to variants table...');
        db.exec('ALTER TABLE variants ADD COLUMN costPrice REAL');
    }

    // Add costPrice to accessories
    const accessoryColumns = db.pragma('table_info(accessories)');
    if (accessoryColumns && !accessoryColumns.some((col: any) => col.name === 'costPrice')) {
        console.log('Adding costPrice column to accessories table...');
        db.exec('ALTER TABLE accessories ADD COLUMN costPrice REAL');
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table:')) {
        // ignore if tables don't exist yet
    } else {
        console.error('Migration failed:', error);
    }
  }
};


// Create tables if they don't exist
const createSchema = () => {
  db.exec('DROP TABLE IF EXISTS shipping_receipts');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT,
      imageUrl TEXT,
      hasVariants BOOLEAN NOT NULL DEFAULT 0,
      isArchived INTEGER DEFAULT 0,
      -- For non-variant items
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
        channel TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtSale REAL NOT NULL,
        cogsAtSale REAL,
        saleDate TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS manual_journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        debitAccount TEXT NOT NULL,
        creditAccount TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'manual'
    );
  `);
};

createSchema();
runMigrations();


const seedData = () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (count.count > 0) {
        return;
    }
};

seedData();

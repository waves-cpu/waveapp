
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(path.join(dbDir, 'inventory.db'));
db.pragma('journal_mode = WAL');

// Simple migration logic
const runMigrations = () => {
  try {
    const salesColumns = db.pragma('table_info(sales)');
    const hasTransactionId = salesColumns.some((col: any) => col.name === 'transactionId');
    const hasPaymentMethod = salesColumns.some((col: any) => col.name === 'paymentMethod');
    const hasResellerName = salesColumns.some((col: any) => col.name === 'resellerName');

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
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT,
      imageUrl TEXT,
      hasVariants BOOLEAN NOT NULL DEFAULT 0,
      -- For non-variant items
      stock INTEGER,
      price REAL,
      size TEXT
    );

    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
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
        productId INTEGER NOT NULL,
        variantId INTEGER,
        channel TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtSale REAL NOT NULL,
        saleDate TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (variantId) REFERENCES variants(id)
    );

     CREATE TABLE IF NOT EXISTS resellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT
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

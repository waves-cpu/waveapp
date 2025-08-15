
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
    // Check if transactionId column exists in sales table
    const columns = db.pragma('table_info(sales)');
    const hasTransactionId = columns.some((col: any) => col.name === 'transactionId');

    if (!hasTransactionId) {
      console.log('Adding transactionId column to sales table...');
      db.exec('ALTER TABLE sales ADD COLUMN transactionId TEXT');
    }
  } catch (error) {
    // This might happen if the sales table doesn't exist yet, which is fine.
    // The createSchema function will handle creating it.
    if (error instanceof Error && error.message.includes('no such table: sales')) {
        // ignore
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
        productId INTEGER NOT NULL,
        variantId INTEGER,
        channel TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtSale REAL NOT NULL,
        saleDate TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id),
        FOREIGN KEY (variantId) REFERENCES variants(id)
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

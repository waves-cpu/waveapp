import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

export const db = new Database(path.join(dbDir, 'inventory.db'));
db.pragma('journal_mode = WAL');

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
  `);
};

createSchema();


// Seed initial data if the database is empty
const seedData = () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (count.count > 0) {
        return;
    }

    console.log('Seeding initial data...');

    const products = [
      { id: 1, name: 'Organic Green Tea', category: 'Beverages', sku: 'TEA-GRN-ORG', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 1 },
      { id: 2, name: 'Whole Wheat Bread', category: 'Bakery', sku: 'BAK-BRD-WW', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 1 },
      { id: 3, name: 'Almond Milk', category: 'Dairy & Alternatives', sku: 'DRY-AMILK', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 1 },
      { id: 4, name: 'Avocados', category: 'Produce', stock: 200, price: 10000, size: 'Per piece', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 0 },
      { id: 5, name: 'Quinoa', category: 'Grains', stock: 100, price: 80000, size: '1kg', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 0 },
      { id: 6, name: 'Dark Chocolate Bar', category: 'Snacks', stock: 80, price: 18000, size: '100g', imageUrl: 'https://placehold.co/40x40.png', hasVariants: 0 },
    ];

    const variants = [
      { id: 1, productId: 1, name: '250g Box', sku: 'TEA-GRN-ORG-250', stock: 150, price: 25000 },
      { id: 2, productId: 1, name: '500g Pouch', sku: 'TEA-GRN-ORG-500', stock: 80, price: 45000 },
      { id: 3, productId: 2, name: '500g Loaf', sku: 'BAK-BRD-WW-500', stock: 75, price: 15000 },
      { id: 4, productId: 3, name: '1L Carton', sku: 'DRY-AMILK-1L', stock: 120, price: 20000 },
    ];

    const insertProduct = db.prepare('INSERT INTO products (id, name, category, sku, imageUrl, hasVariants, stock, price, size) VALUES (@id, @name, @category, @sku, @imageUrl, @hasVariants, @stock, @price, @size)');
    const insertVariant = db.prepare('INSERT INTO variants (id, productId, name, sku, price, stock) VALUES (@id, @productId, @name, @sku, @price, @stock)');
    const insertHistory = db.prepare('INSERT INTO history (productId, variantId, date, change, reason, newStockLevel) VALUES (@productId, @variantId, @date, @change, @reason, @newStockLevel)');
    
    const seedTransaction = db.transaction(() => {
        for (const product of products) insertProduct.run(product as any);
        for (const variant of variants) insertVariant.run(variant);

        // Seed history
        for (const product of products.filter(p => !p.hasVariants)) {
            insertHistory.run({ productId: product.id, variantId: null, date: new Date().toISOString(), change: product.stock, reason: 'Initial Stock', newStockLevel: product.stock });
        }
        for (const variant of variants) {
            insertHistory.run({ productId: variant.productId, variantId: variant.id, date: new Date().toISOString(), change: variant.stock, reason: 'Initial Stock', newStockLevel: variant.stock });
        }
    });

    seedTransaction();
    console.log('Seeding complete.');
};

seedData();

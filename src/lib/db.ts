
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db');
const dbPath = path.join(dbDir, 'waves.db');

let db: Database.Database;

function initializeDatabase() {
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON'); // PENTING: Aktifkan foreign key agar ON DELETE CASCADE bekerja

    createSchema();
    runMigrations();
    seedData();

  } catch (error) {
    if (error instanceof Error && (error.message.includes('not a database') || error.message.includes('corrupt') || error.message.includes('disk I/O error'))) {
      console.error('Database file is corrupt. Re-initializing...');
      if(db && db.open) db.close();
      if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
      
      fs.mkdirSync(dbDir, { recursive: true });
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      createSchema();
      runMigrations();
      seedData();
    } else {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
}

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
        unit TEXT NOT NULL,
        quantityPerUnit INTEGER,
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
        parentImageUrl TEXT,
        productCategory TEXT,
        channel TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        priceAtSale REAL NOT NULL,
        cogsAtSale REAL,
        saleDate TEXT NOT NULL,
        status TEXT DEFAULT 'Completed',
        voucherCode TEXT,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variantId) REFERENCES variants(id) ON DELETE CASCADE,
        FOREIGN KEY (accessoryId) REFERENCES accessories(id) ON DELETE CASCADE
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
        awb TEXT NOT NULL,
        date TEXT NOT NULL,
        channel TEXT NOT NULL,
        salesChannel TEXT,
        status TEXT NOT NULL,
        transactionId TEXT
    );

    CREATE TABLE IF NOT EXISTS printed_receipt_counts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        salesChannel TEXT NOT NULL,
        shippingChannel TEXT NOT NULL,
        count INTEGER NOT NULL
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

    CREATE TABLE IF NOT EXISTS discount_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        channel TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        voucherCode TEXT,
        discountType TEXT,
        discountValue REAL,
        maxUses INTEGER,
        minPurchase REAL
    );
    
    CREATE TABLE IF NOT EXISTS discounted_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        variantId INTEGER,
        discountedPrice REAL NOT NULL,
        FOREIGN KEY (groupId) REFERENCES discount_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variantId) REFERENCES variants(id) ON DELETE CASCADE
    );

    -- 1. Index AWB (Pencegahan Duplikat & Pencarian Cepat)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_receipts_awb ON shipping_receipts(awb);

    -- 2. Index untuk filter Inventory (Sesuai saran sebelumnya)
    CREATE INDEX IF NOT EXISTS idx_shipping_receipts_filters ON shipping_receipts(salesChannel, channel, status);
    
    -- 3. Index Tanggal untuk performa laporan
    CREATE INDEX IF NOT EXISTS idx_shipping_receipts_date ON shipping_receipts(date);

    -- 4. Index Lookup Printed Counts
    CREATE INDEX IF NOT EXISTS idx_printed_counts_lookup ON printed_receipt_counts(date, salesChannel, shippingChannel);

    -- 5. Index User (Untuk login lebih cepat)
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
};

const runMigrations = () => {
    
    const addColumn = (tableName: string, columnName: string, columnDef: string) => {
        try {
            const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
            if (!columns.some(col => col.name === columnName)) {
                db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
            }
        } catch (error) {
            console.error(`Failed to add column ${columnName} to ${tableName}:`, error);
        }
    };
    
    try {
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(saleDate);
            CREATE INDEX IF NOT EXISTS idx_history_product ON history(productId, variantId);
        `);
    } catch (e) {
        console.error("Migration Index Error:", e);
    }

    // User Migrations
    addColumn('users', 'password', "TEXT NOT NULL DEFAULT ''");
    addColumn('users', 'role', "TEXT NOT NULL DEFAULT 'user'");

    // Sales Migrations
    addColumn('sales', 'transactionId', 'TEXT');
    addColumn('sales', 'paymentMethod', 'TEXT');
    addColumn('sales', 'resellerName', 'TEXT');
    addColumn('sales', 'cogsAtSale', 'REAL');
    addColumn('sales', 'parentSku', 'TEXT');
    addColumn('sales', 'status', "TEXT DEFAULT 'Completed'");
    addColumn('sales', 'productCategory', 'TEXT');
    addColumn('sales', 'parentImageUrl', 'TEXT');
    addColumn('sales', 'voucherCode', 'TEXT');

    // Reseller Migrations
    addColumn('resellers', 'phone', 'TEXT');
    addColumn('resellers', 'address', 'TEXT');

    // Product Migrations
    addColumn('products', 'costPrice', 'REAL');
    addColumn('products', 'isArchived', 'INTEGER DEFAULT 0');
    addColumn('products', 'releaseDate', 'TEXT');

    // Variant Migrations
    addColumn('variants', 'costPrice', 'REAL');

    // Accessory Migrations
    addColumn('accessories', 'category', 'TEXT');
    addColumn('accessories', 'unit', "TEXT NOT NULL DEFAULT 'Pcs'");
    addColumn('accessories', 'quantityPerUnit', 'INTEGER');

    // Discount Group Migrations
    addColumn('discount_groups', 'channel', 'TEXT');
    addColumn('discount_groups', 'voucherCode', 'TEXT');
    addColumn('discount_groups', 'discountType', 'TEXT');
    addColumn('discount_groups', 'discountValue', 'REAL');
    addColumn('discount_groups', 'maxUses', 'INTEGER');
    addColumn('discount_groups', 'minPurchase', 'REAL');
    
    try {
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_groups_voucher_code_unique ON discount_groups(voucherCode) WHERE voucherCode IS NOT NULL;');
    } catch(e) {
        console.error("Failed to create unique index on discount_groups", e);
    }
};


const seedData = () => {
    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
        if (userCount.count === 0) {
            db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
              .run('admin', 'admin123', 'admin');
        }

    } catch (e) {
        // Seeding might fail if table doesn't exist yet, which is fine.
    }
};

function getDb() {
  if (!db || !db.open) {
    initializeDatabase();
  }
  return db;
}

const dbProxy = {
  prepare: (sql: string) => {
    const stmt = getDb().prepare(sql);
    return {
      run: (...params: any[]) => stmt.run(...params),
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
    };
  },
  exec: (sql: string) => getDb().exec(sql),
  transaction: (fn: (...args: any[]) => any) => {
    return getDb().transaction(fn);
  },
  pragma: (sql: string) => getDb().pragma(sql),
};

export { dbProxy as db };

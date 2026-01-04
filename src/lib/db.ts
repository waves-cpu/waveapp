
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
  } catch (error) {
    if (error instanceof Error && (error.message.includes('not a database') || error.message.includes('corrupt') || error.message.includes('disk I/O error'))) {
      console.error('Database file is corrupt or invalid. Re-initializing...');
      if(db && db.open) {
        db.close();
      }
      if (fs.existsSync(dbDir)) {
        fs.rmSync(dbDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dbDir, { recursive: true });
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
    } else {
      throw error;
    }
  }

  createSchema();
  runMigrations(); // Run migrations after ensuring base tables exist
  seedData();
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
        awb TEXT NOT NULL UNIQUE,
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_groups_voucher_code_unique ON discount_groups(voucherCode) WHERE voucherCode IS NOT NULL;


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
  `);
};

const runMigrations = () => {
    try {
        const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
        if (!userColumns.some(col => col.name === 'password')) {
            db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''");
        }
        if (!userColumns.some(col => col.name === 'role')) {
            db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
        }

        const salesColumns = db.prepare("PRAGMA table_info(sales)").all() as { name: string }[];
        if (!salesColumns.some(col => col.name === 'transactionId')) db.exec('ALTER TABLE sales ADD COLUMN transactionId TEXT');
        if (!salesColumns.some(col => col.name === 'paymentMethod')) db.exec('ALTER TABLE sales ADD COLUMN paymentMethod TEXT');
        if (!salesColumns.some(col => col.name === 'resellerName')) db.exec('ALTER TABLE sales ADD COLUMN resellerName TEXT');
        if (!salesColumns.some(col => col.name === 'cogsAtSale')) db.exec('ALTER TABLE sales ADD COLUMN cogsAtSale REAL');
        if (!salesColumns.some(col => col.name === 'parentSku')) db.exec('ALTER TABLE sales ADD COLUMN parentSku TEXT');
        if (!salesColumns.some(col => col.name === 'status')) db.exec("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'Completed'");
        if (!salesColumns.some(col => col.name === 'productCategory')) db.exec("ALTER TABLE sales ADD COLUMN productCategory TEXT");
        if (!salesColumns.some(col => col.name === 'parentImageUrl')) db.exec("ALTER TABLE sales ADD COLUMN parentImageUrl TEXT");

        const resellerColumns = db.prepare("PRAGMA table_info(resellers)").all() as { name: string }[];
        if (!resellerColumns.some(col => col.name === 'phone')) db.exec('ALTER TABLE resellers ADD COLUMN phone TEXT');
        if (!resellerColumns.some(col => col.name === 'address')) db.exec('ALTER TABLE resellers ADD COLUMN address TEXT');
        
        const productColumns = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
        if (!productColumns.some(col => col.name === 'costPrice')) db.exec('ALTER TABLE products ADD COLUMN costPrice REAL');
        if (!productColumns.some(col => col.name === 'isArchived')) db.exec('ALTER TABLE products ADD COLUMN isArchived INTEGER DEFAULT 0');
        if (!productColumns.some(col => col.name === 'releaseDate')) db.exec('ALTER TABLE products ADD COLUMN releaseDate TEXT');
        
        const variantColumns = db.prepare("PRAGMA table_info(variants)").all() as { name: string }[];
        if (!variantColumns.some(col => col.name === 'costPrice')) db.exec('ALTER TABLE variants ADD COLUMN costPrice REAL');
        
        const accessoryColumns = db.prepare("PRAGMA table_info(accessories)").all() as { name: string }[];
        if (!accessoryColumns.some(col => col.name === 'category')) db.exec('ALTER TABLE accessories ADD COLUMN category TEXT');
        if (!accessoryColumns.some(col => col.name === 'unit')) db.exec("ALTER TABLE accessories ADD COLUMN unit TEXT NOT NULL DEFAULT 'Pcs'");
        if (!accessoryColumns.some(col => col.name === 'quantityPerUnit')) db.exec('ALTER TABLE accessories ADD COLUMN quantityPerUnit INTEGER');
        
        const discountGroupColumns = db.prepare("PRAGMA table_info(discount_groups)").all() as { name: string }[];
        if (!discountGroupColumns.some(col => col.name === 'channel')) db.exec('ALTER TABLE discount_groups ADD COLUMN channel TEXT');
        if (!discountGroupColumns.some(col => col.name === 'voucherCode')) db.exec('ALTER TABLE discount_groups ADD COLUMN voucherCode TEXT');
        if (!discountGroupColumns.some(col => col.name === 'discountType')) db.exec('ALTER TABLE discount_groups ADD COLUMN discountType TEXT');
        if (!discountGroupColumns.some(col => col.name === 'discountValue')) db.exec('ALTER TABLE discount_groups ADD COLUMN discountValue REAL');
        if (!discountGroupColumns.some(col => col.name === 'maxUses')) db.exec('ALTER TABLE discount_groups ADD COLUMN maxUses INTEGER');
        if (!discountGroupColumns.some(col => col.name === 'minPurchase')) db.exec('ALTER TABLE discount_groups ADD COLUMN minPurchase REAL');
    } catch (error) {
        console.error("Error running migrations:", error);
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

    
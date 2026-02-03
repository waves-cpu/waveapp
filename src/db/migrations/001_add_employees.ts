
import type { Database } from 'better-sqlite3';

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        nikKependudukan TEXT,
        nikPekerja TEXT,
        fullName TEXT NOT NULL,
        division TEXT,
        position TEXT,
        address TEXT,
        startDate TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

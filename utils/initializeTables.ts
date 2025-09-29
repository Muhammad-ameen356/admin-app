import { dbName } from "@/constants/DBConstants";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";

const createTableInDB = async () => {
  let db: SQLiteDatabase = await openDatabaseAsync(dbName, {
    useNewConnection: true,
  });

  await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL
      );
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          employeeId INTEGER NOT NULL UNIQUE
        );
      `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          order_date TEXT NOT NULL,
          order_time TEXT NOT NULL,
          total_amount INTEGER,
          paid_amount INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
      `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER,
          item_id INTEGER,
          quantity INTEGER NOT NULL,
          FOREIGN KEY(order_id) REFERENCES orders(id),
          FOREIGN KEY(item_id) REFERENCES items(id)
        );
      `);

  // 🔹 Migration: Add column if it doesn’t exist
  try {
    await db.execAsync(`ALTER TABLE items ADD COLUMN completed_date TEXT;`);
  } catch (e) {
    // ignore "duplicate column" errors
    if (!String(e).includes("duplicate column name")) {
      console.error("Migration error:", e);
    }
  }
};

export const dropAllTables = async () => {
  const db: SQLiteDatabase = await openDatabaseAsync(dbName, {
    useNewConnection: true,
  });

  try {
    // Disable foreign key checks to allow dropping in any order
    await db.execAsync("PRAGMA foreign_keys = OFF;");

    await db.execAsync("DROP TABLE IF EXISTS order_items;");
    await db.execAsync("DROP TABLE IF EXISTS orders;");
    await db.execAsync("DROP TABLE IF EXISTS items;");
    await db.execAsync("DROP TABLE IF EXISTS users;");

    await db.execAsync("PRAGMA foreign_keys = ON;");

    console.log("All tables dropped successfully.");
  } catch (error) {
    console.error("Error dropping tables:", error);
  }
};

export default createTableInDB;

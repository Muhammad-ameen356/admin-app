import { dbName } from "@/constants/constants";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";

const createTableInDB = async () => {
  let db: SQLiteDatabase = await openDatabaseAsync(dbName);

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
          employeeId INTEGER NOT NULL
        );
      `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          date TEXT DEFAULT (DATE('now')),
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
};

export default createTableInDB;

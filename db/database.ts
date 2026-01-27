import { dbName } from "@/constants/DBConstants";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLiteDatabase> => {
  if (!db) {
    db = await openDatabaseAsync(dbName); // ❌ NO useNewConnection
  }
  return db;
};

export const closeDb = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log("SQLite DB closed");
  }
};

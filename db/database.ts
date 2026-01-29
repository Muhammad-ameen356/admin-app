import { dbName } from "@/constants/DBConstants";
import * as FileSystem from "expo-file-system";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;
const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

export const getDb = async (): Promise<SQLiteDatabase> => {
  if (!db) {
    db = await openDatabaseAsync(dbName); // ❌ NO useNewConnection
  }
  return db;
};

export const closeDatabase = async () => {
  try {
    if (db) await db.closeAsync();
    db = null;
    console.log("SQLite database closed");
  } catch (err) {
    console.warn("DB close failed or already closed");
  }
};

export const deleteDatabaseFiles = async () => {
  const files = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];

  for (const file of files) {
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) {
      await FileSystem.deleteAsync(file, { idempotent: true });
    }
  }
};

import { dbName } from "@/constants/DBConstants";
import { UserType } from "@/context/AuthContext";
import { closeDatabase } from "@/db/database";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import { findBackupFile, signInNative } from "./exportDb";

const dbDir = `${FileSystem.documentDirectory}SQLite`;
const dbPath = `${dbDir}/${dbName}`;
const tempPath = `${dbDir}/${dbName}.tmp`;
const backupPath = `${dbDir}/${dbName}.bak`;

export const importDb = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/octet-stream", "application/x-sqlite3"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const pickedFile = result.assets[0];

    // 1️⃣ Extension check
    const fileName = pickedFile.name?.toLowerCase() || "";
    if (!fileName.endsWith(".db")) {
      Alert.alert("Invalid file", "Only .db files are allowed.");
      return;
    }

    // 2️⃣ SQLite header check
    const header = await FileSystem.readAsStringAsync(pickedFile.uri, {
      encoding: FileSystem.EncodingType.UTF8,
      length: 16,
      position: 0,
    });

    if (!header.startsWith("SQLite format 3")) {
      Alert.alert("Invalid database", "Not a valid SQLite DB file.");
      return;
    }

    // 3️⃣ Copy DB
    const dbDir = `${FileSystem.documentDirectory}SQLite`;
    const destPath = `${dbDir}/${dbName}`;

    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    await FileSystem.copyAsync({
      from: pickedFile.uri,
      to: destPath,
    });

    Alert.alert(
      "Success",
      "Database imported successfully. Please restart the app.",
    );
  } catch (error) {
    console.error("DB import error:", error);
    Alert.alert("Error", "Failed to import database.");
  }
};

export const importDbFromGoogleDrive = async (): Promise<{
  user: UserType;
}> => {
  try {
    // 1️⃣ CLOSE DB COMPLETELY
    await closeDatabase();

    // 2️⃣ AUTH
    const { accessToken, user } = await signInNative();

    const safeUser: UserType = {
      name: user.name ?? null,
      email: user.email ?? "",
      photo: user.photo ?? null,
    };

    // 3️⃣ FIND BACKUP
    const backupFile = await findBackupFile(accessToken);
    if (!backupFile?.id) {
      throw new Error("No backup found in Google Drive");
    }

    // 4️⃣ ENSURE SQLITE DIR
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // 5️⃣ CLEAN TEMP FILE (if exists)
    const tempInfo = await FileSystem.getInfoAsync(tempPath);
    if (tempInfo.exists) {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
    }

    // 6️⃣ DOWNLOAD TO TEMP FILE
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${backupFile.id}?alt=media`;

    const result = await FileSystem.downloadAsync(downloadUrl, tempPath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Accept-Encoding": "identity",
      },
    });

    if (result.status !== 200) {
      throw new Error("Database download failed");
    }

    // 7️⃣ BASIC VALIDATION (file size check)
    const tempStat = await FileSystem.getInfoAsync(tempPath);
    if (!tempStat.exists || !tempStat.size || tempStat.size < 1000) {
      throw new Error("Downloaded database is invalid");
    }

    // 8️⃣ BACKUP EXISTING DB (IF ANY)
    const existingDb = await FileSystem.getInfoAsync(dbPath);
    if (existingDb.exists) {
      await FileSystem.moveAsync({
        from: dbPath,
        to: backupPath,
      });
    }

    // 9️⃣ PROMOTE TEMP → REAL DB
    await FileSystem.moveAsync({
      from: tempPath,
      to: dbPath,
    });

    // 🔟 DELETE OLD BACKUP (SAFE NOW)
    const bakInfo = await FileSystem.getInfoAsync(backupPath);
    if (bakInfo.exists) {
      await FileSystem.deleteAsync(backupPath, { idempotent: true });
    }

    return { user: safeUser };
  } catch (err: any) {
    console.error("Import failed:", err);

    // 🛟 ROLLBACK IF NEEDED
    const bakInfo = await FileSystem.getInfoAsync(backupPath);
    const dbInfo = await FileSystem.getInfoAsync(dbPath);

    console.log(bakInfo.exists, "bakInfo");
    console.log(dbInfo.exists, "bakInfo");

    if (bakInfo.exists && !dbInfo.exists) {
      await FileSystem.moveAsync({
        from: backupPath,
        to: dbPath,
      });
    }

    Alert.alert("Import failed", err.message || "Unknown error");
    throw err;
  }
};

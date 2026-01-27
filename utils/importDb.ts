import { dbName } from "@/constants/DBConstants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";

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

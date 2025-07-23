import { dbName } from "@/constants/DBConstants"; // your current DB name
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Alert } from 'react-native';

export const importDb = async () => {
  try {
    // Step 1: Let user pick a file
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*", // You can restrict to .db if needed
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      console.log("Import cancelled");
      return;
    }

    const pickedFile = result.assets[0];
    const sourceUri = pickedFile.uri;

    // Step 2: Target path for your app’s DB file
    const dbDir = `${FileSystem.documentDirectory}SQLite`;
    const destPath = `${dbDir}/${dbName}`;

    // Ensure DB folder exists
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    // Step 3: Copy selected .db file over current DB
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destPath,
    });

    console.log("Database imported successfully.");
    Alert.alert("Database imported successfully. Restart the app to see changes.");
  } catch (error) {
    console.error("Error importing DB:", error);
    Alert.alert("Failed to import database.");
  }
};

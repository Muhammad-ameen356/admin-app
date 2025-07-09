import { dbName } from "@/constants/DBConstants";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export const exportDb = async () => {
  const dbUri = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  const dest = `${FileSystem.documentDirectory}mydb-exported.db`;

  try {
    await FileSystem.copyAsync({
      from: dbUri,
      to: dest,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest);
    } else {
      console.log("Sharing not available on this device.");
    }
  } catch (error) {
    console.error("Export failed:", error);
  }
};

import { LAST_BACKUP_KEY } from "@/constants/DBConstants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export const saveLastBackupTime = async () => {
  await AsyncStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
};

const HOURS_24 = 24 * 60 * 60 * 1000;

export const isBackupOverdue = async (): Promise<boolean> => {
  const last = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  if (!last) return false; // never backed up

  const lastTime = Number(last);
  return Date.now() - lastTime > HOURS_24;
};

export const checkBackupAndAlert = async (onBackupPress: () => void) => {
  const overdue = await isBackupOverdue();
  if (!overdue) return;

  Alert.alert(
    "Backup Recommended",
    "Your data hasn’t been backed up in the last 24 hours.",
    [
      { text: "Later", style: "cancel" },
      {
        text: "Backup Now",
        onPress: onBackupPress,
      },
    ],
  );
};

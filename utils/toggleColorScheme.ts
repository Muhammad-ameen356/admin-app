// utils/toggleColorScheme.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themeEventEmitter } from "./themeEventEmitter";

const STORAGE_KEY = "user-color-scheme";

export async function toggleColorScheme() {
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const next = current === "dark" ? "light" : "dark";
  await AsyncStorage.setItem(STORAGE_KEY, next);
  themeEventEmitter.emit(); // 🔥 Notify listeners
}

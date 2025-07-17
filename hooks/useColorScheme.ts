// hooks/useColorScheme.ts
import { themeEventEmitter } from "@/utils/themeEventEmitter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
    useColorScheme as useSystemColorScheme
} from "react-native";

type ColorScheme = "light" | "dark";
const STORAGE_KEY = "user-color-scheme";

export function useColorScheme(): ColorScheme {
  const systemColorScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorScheme] =
    useState<ColorScheme>(systemColorScheme);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (isMounted) {
        if (stored === "light" || stored === "dark") {
          setColorScheme(stored);
        } else {
          setColorScheme(systemColorScheme);
        }
      }
    };

    load();

    const remove = themeEventEmitter.addListener(() => {
      load(); // Reload and update theme
    });

    return () => {
      isMounted = false;
      remove();
    };
  }, [systemColorScheme]);

  return colorScheme;
}

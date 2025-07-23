import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import CustomDrawer from "@/components/CustomDrawer";
import { useColorScheme } from "@/hooks/useColorScheme";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import createTableInDB from "../utils/initializeTables";

dayjs.extend(customParseFormat);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    const createTable = async () => {
      try {
        await createTableInDB();
      } catch (err) {
        Alert.alert(`Error In Creating table ${err}`);
      }
    };

    createTable();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          drawerContent={(props) => <CustomDrawer {...props} />}
          screenOptions={{
            headerShown: true,
            drawerStyle: {
              backgroundColor: colorScheme === "dark" ? "#1e1e1e" : "#fff",
            },
            drawerActiveTintColor: colorScheme === "dark" ? "#fff" : "#000",
            drawerInactiveTintColor: colorScheme === "dark" ? "#aaa" : "#444",
          }}
        >
          <Drawer.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              drawerLabel: "Home",
            }}
          />

          <Drawer.Screen
            name="orderHistory"
            options={{
              headerShown: true,
              drawerLabel: "Order History",
              title: "Order History",
            }}
          />
        </Drawer>
      </GestureHandlerRootView>

      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

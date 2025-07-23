import { useColorScheme } from "@/hooks/useColorScheme";
import { exportDb } from "@/utils/exportDb";
import { importDb } from "@/utils/importDb";
import { toggleColorScheme } from "@/utils/toggleColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Alert, Image, View } from "react-native";
import { ThemedText } from "./ThemedText";

export default function CustomDrawer(props: any) {
  const router = useRouter();
  const colorScheme = useColorScheme();

  const backgroundColor = colorScheme === "dark" ? "#1e1e1e" : "#fff";
  const textColor = colorScheme === "dark" ? "#fff" : "#000";

  const handleExport = async () => {
    try {
      await exportDb();
    } catch (err) {
      Alert.alert("Error", "Failed to export database.");
    }
  };

  const handleImport = async () => {
    try {
      await importDb();
    } catch (err) {
      Alert.alert("Error", "Failed to import database.");
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor }}
    >
      {/* Logo & App Title */}
      <View style={{ alignItems: "center", marginVertical: 20 }}>
        <Image
          source={require("@/assets/images/logo.png")} // ✅ Replace with your image path
          style={{ width: 100, height: 100, borderRadius: 40 }}
          resizeMode="contain"
        />
        <ThemedText
          style={{ marginTop: 10, fontWeight: "bold", color: textColor }}
        >
          ADMIN APP
        </ThemedText>
      </View>

      <DrawerItem
        label="Home"
        labelStyle={{ color: textColor }}
        icon={({ size }) => (
          <Ionicons name="home-outline" size={size} color={textColor} />
        )}
        onPress={() => router.push("/")}
      />

      <DrawerItem
        label="Order History"
        labelStyle={{ color: textColor }}
        icon={({ size }) => (
          <Ionicons name="time-outline" size={size} color={textColor} />
        )}
        onPress={() => router.push("/orderHistory")}
      />

      <View
        style={{
          marginVertical: 12,
          borderTopWidth: 1,
          borderTopColor: textColor,
        }}
      />

      <DrawerItem
        label="Export Database"
        labelStyle={{ color: textColor }}
        icon={({ size }) => (
          <Ionicons name="cloud-upload-outline" size={size} color={textColor} />
        )}
        onPress={handleExport}
      />

      <DrawerItem
        label="Import Database"
        labelStyle={{ color: textColor }}
        icon={({ size }) => (
          <Ionicons
            name="cloud-download-outline"
            size={size}
            color={textColor}
          />
        )}
        onPress={handleImport}
      />

      <DrawerItem
        label={`Switch to ${colorScheme === "dark" ? "Light" : "Dark"} Mode`}
        labelStyle={{ color: textColor }}
        icon={({ size }) => (
          <Ionicons
            name={colorScheme === "dark" ? "sunny-outline" : "moon-outline"}
            size={size}
            color={textColor}
          />
        )}
        onPress={async () => {
          await toggleColorScheme();
          // Optionally force re-render or restart
          // You can reload the app if you want to force theme update:
          // import { DevSettings } from 'react-native';
          // DevSettings.reload();
        }}
      />
    </DrawerContentScrollView>
  );
}

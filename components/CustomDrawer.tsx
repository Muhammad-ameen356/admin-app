import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { backupDbToGoogleDrive } from "@/utils/exportDb";
import { importDb } from "@/utils/importDb";
import { toggleColorScheme } from "@/utils/toggleColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Text, View } from "react-native";
import { ThemedText } from "./ThemedText";

export default function CustomDrawer(props: any) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { user, logout, login, loading: contextLoading } = useAuth(); // reactive user state
  const [loading, setLoading] = useState(false);

  const backgroundColor = colorScheme === "dark" ? "#1e1e1e" : "#fff";
  const textColor = colorScheme === "dark" ? "#fff" : "#000";

  const handleExport = async () => {
    setLoading(true);
    try {
      const { user } = await backupDbToGoogleDrive();
      login(user); // <-- updates context

      Alert.alert(
        "Backup Successful",
        "Your database has been safely backed up to Google Drive.",
      );
    } catch (err) {
      console.log(err, "err");
      Alert.alert("Error", `${err || "Failed to export database."}`);
    } finally {
      setLoading(false);
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
          source={require("@/assets/images/logo.png")}
          style={{ width: 100, height: 100, borderRadius: 40 }}
          resizeMode="contain"
        />
        <ThemedText
          style={{ marginTop: 10, fontWeight: "bold", color: textColor }}
        >
          ADMIN APP
        </ThemedText>

        {/* Show logged-in user */}
        {user ? (
          <>
            <ThemedText
              style={{ fontWeight: "bold", fontSize: 16, color: textColor }}
            >
              {user.name}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: "#888" }}>
              {user.email}
            </ThemedText>
          </>
        ) : (
          <ThemedText style={{ fontSize: 14, color: "#888" }}>Guest</ThemedText>
        )}
      </View>

      {/* Drawer Items */}
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
        label={user ? "Export Database" : "Signin To Export Database"}
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
        onPress={toggleColorScheme}
      />

      {/* Logout */}
      {user && (
        <DrawerItem
          label="Logout"
          labelStyle={{ color: loading ? "gray" : "red" }} // gray if disabled
          icon={({ size }) => (
            <Ionicons
              name="exit-outline"
              size={size}
              color={loading ? "gray" : "red"}
            />
          )}
          onPress={() => {
            if (!loading) logout(); // ignore if loading
          }}
        />
      )}

      {/* Loader */}
      {(loading || contextLoading) && (
        <View style={{ marginVertical: 10, alignItems: "center" }}>
          <Text>Please Wait </Text>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      )}
    </DrawerContentScrollView>
  );
}

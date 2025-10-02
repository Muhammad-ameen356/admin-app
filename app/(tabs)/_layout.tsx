import { Entypo, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { DrawerActions } from "@react-navigation/native";
import { scheduleWeeklyBackupReminder } from "../../utils/notification";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    scheduleWeeklyBackupReminder();
  }, []);

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: themeColors.background }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColors.tint,
          tabBarInactiveTintColor: themeColors.tabIconDefault,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: -0.2,
          },
          tabBarStyle: Platform.select<ViewStyle>({
            ios: {
              position: "absolute",
              height: 70,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: themeColors.card,
              borderTopWidth: 1,
              borderTopColor: themeColors.border,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: -4 },
              shadowRadius: 16,
              elevation: 12,
            },
            android: {
              height: 75,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: themeColors.card,
              borderTopWidth: 1,
              borderTopColor: themeColors.border,
              elevation: 12,
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Feather name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: "Items",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="inventory" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ordersReceiving"
          options={{
            title: "Take Order",
            tabBarIcon: ({ color }) => (
              <Entypo name="edit" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="itemSummary"
          options={{
            title: "Summary",
            tabBarIcon: ({ color }) => (
              <Feather name="bar-chart" size={22} color={color} />
            ),
          }}
        />
        {/* <Tabs.Screen
          name="orderHistory"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => (
              <Ionicons name="time" size={22} color={color} />
            ),
          }}
        /> */}
        <Tabs.Screen
          name="settings"
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault(); // Stop default navigation
              navigation.dispatch(DrawerActions.openDrawer()); // Open drawer
            },
          })}
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

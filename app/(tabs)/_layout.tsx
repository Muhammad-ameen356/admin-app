import { Entypo, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { scheduleWeeklyBackupReminder } from "../utils/notification";

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
          tabBarInactiveTintColor: "#999",
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          tabBarStyle: Platform.select<ViewStyle>({
            ios: {
              position: "absolute",
              height: 70,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: themeColors.background,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: -3 },
              shadowRadius: 10,
              elevation: 10,
            },
            android: {
              height: 75,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: themeColors.background,
              borderTopWidth: 0.2,
              elevation: 10,
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
        <Tabs.Screen
          name="orderHistory"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => (
              <Ionicons name="time" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";
import { openDatabaseAsync } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";

type UserBalance = {
  id: number;
  name: string;
  employeeId: number;
  total: number;
  paid: number;
};

export default function HomeScreen() {
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [dropdownItems, setDropdownItems] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<
    "all" | "pending" | "settled" | "extra"
  >("all");

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const fetchUserBalances = async (employeeId?: number | null) => {
    const db = await openDatabaseAsync(dbName, {
      useNewConnection: true,
    });

    const condition = employeeId
      ? `WHERE o.user_id IS NOT NULL AND u.employeeId = ${employeeId}`
      : `WHERE o.user_id IS NOT NULL`;

    const query = `
      SELECT 
        u.id,
        u.name,
        u.employeeId,
        IFNULL(SUM(o.total_amount), 0) AS total,
        IFNULL(SUM(o.paid_amount), 0) AS paid
      FROM users u
      JOIN orders o ON u.id = o.user_id
      ${condition}
      GROUP BY u.id
      ORDER BY u.name
    `;

    const result = await db.getAllAsync<UserBalance>(query);
    setUserBalances(result);
  };

  const fetchDropdownUsers = async () => {
    const db = await openDatabaseAsync(dbName, {
      useNewConnection: true,
    });

    const result = await db.getAllAsync<{ employeeId: number; name: string }>(
      `SELECT employeeId, name FROM users ORDER BY name`
    );

    const items = result.map((user) => ({
      label: `${user.name} (${user.employeeId})`,
      value: user.employeeId,
    }));

    setDropdownItems(items);
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await fetchDropdownUsers();
        await fetchUserBalances(); // fetch all users by default
        setLoading(false);
      })();
    }, [])
  );

  useEffect(() => {
    fetchUserBalances(selectedEmployeeId);
  }, [selectedEmployeeId]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ThemedText style={[styles.title, { color: theme.text }]}>
        User Balance Summary
      </ThemedText>

      <DropDownPicker
        listMode="MODAL"
        open={open}
        value={selectedEmployeeId}
        items={dropdownItems}
        setOpen={setOpen}
        setValue={setSelectedEmployeeId}
        setItems={setDropdownItems}
        placeholder="Filter by Employee ID"
        searchable={true}
        style={[
          styles.dropdown,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        dropDownContainerStyle={{
          backgroundColor: theme.card,
          borderColor: theme.border,
        }}
        textStyle={{ color: theme.text }}
        placeholderStyle={{ color: theme.text }}
        searchTextInputStyle={{ color: theme.text }}
        modalContentContainerStyle={{ backgroundColor: theme.background }}
      />

      <TouchableOpacity
        onPress={() => {
          setSelectedEmployeeId(null);
          setBalanceStatusFilter("all");
        }}
        style={[styles.resetButton, { backgroundColor: theme.card }]}
      >
        <ThemedText style={[styles.resetButtonText, { color: theme.text }]}>
          🔄 Show All Users
        </ThemedText>
      </TouchableOpacity>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        {[
          { label: "All", value: "all" },
          { label: "Pending", value: "pending" },
          { label: "Settled", value: "settled" },
          { label: "Extra Paid", value: "extra" },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => setBalanceStatusFilter(filter.value as any)}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  balanceStatusFilter === filter.value
                    ? theme.tint
                    : theme.card,
              },
            ]}
          >
            <ThemedText
              style={{
                color:
                  balanceStatusFilter === filter.value
                    ? theme.background // contrast with white background
                    : theme.text,
                fontWeight: "600",
              }}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtered FlatList */}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        data={userBalances.filter((item) => {
          const balance = item.paid - item.total;
          if (balanceStatusFilter === "pending") return balance < 0;
          if (balanceStatusFilter === "settled") return balance === 0;
          if (balanceStatusFilter === "extra") return balance > 0;
          return true;
        })}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const balance = item.paid - item.total;

          return (
            <ThemedView style={[styles.card, { backgroundColor: theme.card }]}>
              <ThemedText style={[styles.name, { color: theme.text }]}>
                👤 {item.name} ({item.employeeId})
              </ThemedText>
              <ThemedText style={{ color: theme.text }}>
                Total Orders: Rs {item.total}
              </ThemedText>
              <ThemedText style={{ color: theme.text }}>
                Paid: Rs {item.paid}
              </ThemedText>
              <ThemedText
                style={{
                  fontWeight: "bold",
                  color:
                    balance === 0 ? "green" : balance < 0 ? "red" : "orange",
                }}
              >
                {balance === 0
                  ? "✅ Settled"
                  : balance < 0
                  ? `❌ Pending: Rs ${Math.abs(balance)}`
                  : `💰 Extra Paid: Rs ${balance}`}
              </ThemedText>
            </ThemedView>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 18, flex: 1,  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  dropdown: {
    marginBottom: 20,
    borderWidth: 1,
  },
  card: {
    borderWidth: 0.7,
    borderColor: "#5f5f5f",
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  resetButton: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    alignItems: "center",
  },
  resetButtonText: {
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    flexWrap: "nowrap", // ❗️Prevent wrapping
  },

  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexShrink: 1, // ❗️Allow shrinking if needed
    minWidth: 0, // ❗️Allow to shrink below content width if needed
  },
});

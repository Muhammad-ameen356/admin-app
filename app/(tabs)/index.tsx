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

  const resetFilters = () => {
    setSelectedEmployeeId(null);
    setBalanceStatusFilter("all");
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await fetchDropdownUsers();
        await fetchUserBalances(); // fetch all users by default
        setLoading(false);
      })();
      return () => {
        resetFilters();
      };
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
        onPress={resetFilters}
        style={[
          styles.resetButton,
          { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
        ]}
      >
        <ThemedText style={[styles.resetButtonText, { color: theme.text }]}>
          Show All Users
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
                fontSize: 14,
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
          const statusColor =
            balance === 0
              ? theme.success
              : balance < 0
              ? theme.error
              : theme.warning;

          return (
            <ThemedView
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <ThemedText style={[styles.name, { color: theme.text }]}>
                {item.name}
              </ThemedText>
              <ThemedText
                style={[
                  styles.infoLabel,
                  { color: theme.secondary, marginBottom: 8 },
                ]}
              >
                Employee ID: {item.employeeId}
              </ThemedText>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.text }]}>
                  Total Orders
                </ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>
                  Rs {item.total}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: theme.text }]}>
                  Amount Paid
                </ThemedText>
                <ThemedText style={[styles.infoValue, { color: theme.text }]}>
                  Rs {item.paid}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor, marginTop: 12 },
                ]}
              >
                <ThemedText style={styles.statusText}>
                  {balance === 0
                    ? "Settled"
                    : balance < 0
                    ? `Pending: Rs ${Math.abs(balance)}`
                    : `Extra Paid: Rs ${balance}`}
                </ThemedText>
              </View>
            </ThemedView>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 20, flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  dropdown: {
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  resetButton: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resetButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    flexWrap: "nowrap",
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexShrink: 1,
    minWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});

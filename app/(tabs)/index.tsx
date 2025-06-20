import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/DBConstants";
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

  const fetchUserBalances = async (employeeId?: number | null) => {
    const db = await openDatabaseAsync(dbName, {
      useNewConnection: true,
    });

    const condition = employeeId ? `WHERE u.employeeId = ${employeeId}` : "";

    const query = `
      SELECT 
        u.id,
        u.name,
        u.employeeId,
        IFNULL(SUM(o.total_amount), 0) AS total,
        IFNULL(SUM(o.paid_amount), 0) AS paid
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
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
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ThemedText style={styles.title}>User Balance Summary</ThemedText>

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
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
      />
      <TouchableOpacity
        onPress={() => setSelectedEmployeeId(null)}
        style={styles.resetButton}
      >
        <ThemedText style={styles.resetButtonText}>
          🔄 Show All Users
        </ThemedText>
      </TouchableOpacity>

      <FlatList
        data={userBalances}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const balance = item.paid - item.total;

          return (
            <ThemedView style={styles.card}>
              <ThemedText style={styles.name}>
                👤 {item.name} ({item.employeeId})
              </ThemedText>
              <ThemedText>Total Orders: Rs {item.total}</ThemedText>
              <ThemedText>Paid: Rs {item.paid}</ThemedText>
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
  container: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  dropdown: {
    marginBottom: 20,
    borderColor: "#ccc",
  },
  dropdownContainer: {
    borderColor: "#ccc",
  },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  resetButton: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    alignItems: "center",
  },
  resetButtonText: {
    fontWeight: "600",
    color: "#333",
  },
});

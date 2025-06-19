import { dbName } from "@/constants/constants";
import { openDatabaseAsync } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type UserBalance = {
  id: number;
  name: string;
  employeeId: number;
  total: number;
  paid: number;
};

export default function HomeScreen() {
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await openDatabaseAsync(dbName, {
        useNewConnection: true,
      });

      const result = await db.getAllAsync<UserBalance>(`
        SELECT 
          u.id,
          u.name,
          u.employeeId,
          IFNULL(SUM(o.total_amount), 0) AS total,
          IFNULL(SUM(o.paid_amount), 0) AS paid
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
        ORDER BY u.name
      `);

      setUserBalances(result);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>User Balance Summary</Text>

      {userBalances.map((user) => {
        const balance = user.paid - user.total;

        return (
          <View key={user.id} style={styles.card}>
            <Text style={styles.name}>
              👤 {user.name} ({user.employeeId})
            </Text>
            <Text>Total Orders: Rs {user.total}</Text>
            <Text>Paid: Rs {user.paid}</Text>
            <Text
              style={{
                fontWeight: "bold",
                color: balance === 0 ? "green" : balance < 0 ? "red" : "orange",
              }}
            >
              {balance === 0
                ? "✅ Settled"
                : balance < 0
                ? `❌ Pending: Rs ${Math.abs(balance)}`
                : `💰 Extra Paid: Rs ${balance}`}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});

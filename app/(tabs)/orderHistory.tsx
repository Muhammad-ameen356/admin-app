import { dbName } from "@/constants/constants";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Button,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

let db: SQLiteDatabase;

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        fetchOrders(selectedDate);
      })();
    }, [])
  );

  const fetchOrders = async (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];

    const result = await db.getAllAsync<any>(
      `SELECT orders.id, orders.date, users.name AS userName, orders.total_amount, orders.paid_amount
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.date = ?
       ORDER BY orders.id DESC`,
      [dateStr]
    );

    setOrders(result);
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      setSelectedDate(selected);
      fetchOrders(selected);
    }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const diff = item.paid_amount - item.total_amount;
    let statusText = "Paid in full";
    let statusColor = "green";

    if (diff < 0) {
      statusText = `Remaining: Rs ${Math.abs(diff)}`;
      statusColor = "red";
    } else if (diff > 0) {
      statusText = `Advance: Rs ${diff}`;
      statusColor = "orange";
    }

    return (
      <View style={styles.orderCard}>
        <Text style={styles.orderText}>👤 {item.userName}</Text>
        <Text>Date: {item.date}</Text>
        <Text>Total: Rs {item.total_amount}</Text>
        <Text>Paid: Rs {item.paid_amount}</Text>
        <Text style={{ color: statusColor, fontWeight: "bold" }}>
          {statusText}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order History</Text>

      <Text style={styles.label}>
        📅 Date: {selectedDate.toISOString().split("T")[0]}
      </Text>
      <Button title="Select Date" onPress={() => setShowDatePicker(true)} />

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found for this date.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 10 },
  noOrders: { marginTop: 20, fontSize: 16, color: "gray" },
  orderCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  orderText: { fontSize: 16, fontWeight: "600" },
});

import { ThemedText } from "@/components/ThemedText";
import { DATE_FORMAT_FOR_SHOW } from "@/constants/constants";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const todayDate = dayjs().toDate(); // Returns a JS Date object

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSelectedDate(todayDate);
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        fetchOrders(todayDate);
      })();
    }, [])
  );

  const fetchOrders = async (date: Date) => {
    const dateStr = dayjs(date).format(DATE_FORMAT_FOR_DB);

    const result = await db.getAllAsync<any>(
      `SELECT 
          u.id AS userId,
          u.name AS userName,
          SUM(o.total_amount) AS total_amount,
          SUM(o.paid_amount) AS paid_amount,
          (
            SELECT GROUP_CONCAT(item_summary, ', ')
            FROM (
              SELECT i.name || ' x ' || SUM(oi.quantity) AS item_summary
              FROM orders o2
              JOIN order_items oi ON oi.order_id = o2.id
              JOIN items i ON i.id = oi.item_id
              WHERE o2.user_id = u.id AND o2.order_date = o.order_date
              GROUP BY i.name
            )
          ) AS items_summary
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.order_date = ?
        GROUP BY u.id
        ORDER BY u.name ASC
      `,
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
    <SafeAreaView style={styles.container}>
      <ThemedText style={styles.title}>Order History</ThemedText>

      <ThemedText style={styles.label}>
        📅 Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
      </ThemedText>
      <Button title="Select Date" onPress={() => setShowDatePicker(true)} />

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* {orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found for this date.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )} */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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

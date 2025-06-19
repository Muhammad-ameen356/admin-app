import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import _ from "lodash";
import React, { useCallback, useState } from "react";

import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

let db: SQLiteDatabase;

export default function OrderHistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [groupedOrders, setGroupedOrders] = useState<Record<number, any[]>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>(
    {}
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        fetchOrdersByDate(selectedDate);
      })();
    }, [])
  );

  const fetchOrdersByDate = async (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const result = await db.getAllAsync<any>(
      `SELECT orders.id, users.id as userId, users.name as userName, orders.total_amount, orders.paid_amount, orders.date
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.date = ?
       ORDER BY users.name`,
      [dateStr]
    );

    const grouped: Record<number, any[]> = {};
    result.forEach((order) => {
      if (!grouped[order.userId]) grouped[order.userId] = [];
      grouped[order.userId].push(order);
    });

    console.log(grouped, "grouped");
    setGroupedOrders(grouped);
  };

  const onChangeDate = (event: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) {
      setSelectedDate(selected);
      fetchOrdersByDate(selected);
    }
  };

  const toggleUserExpansion = (userId: number) => {
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const formatTime = (datetime: string): string => {
    console.log(datetime);
    if (!_.isString(datetime)) return "Invalid Time";

    const date = new Date(datetime);
    if (_.isNaN(date.getTime())) return "Invalid Time";

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 to 12
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;

    return `${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.title}>Order History</ThemedText>

      <ThemedText style={styles.dateLabel}>
        🗓 Date: {selectedDate.toISOString().split("T")[0]}
      </ThemedText>
      <Button title="Select Date" onPress={() => setShowPicker(true)} />
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {Object.keys(groupedOrders).length === 0 ? (
        <ThemedText style={styles.noData}>No orders found.</ThemedText>
      ) : (
        Object.entries(groupedOrders).map(([userId, orders]) => {
          const isExpanded = expandedUsers[+userId];
          const total = orders.reduce((acc, o) => acc + o.total_amount, 0);
          const paid = orders.reduce((acc, o) => acc + o.paid_amount, 0);
          const remaining = total - paid;
          const statusText =
            remaining === 0 ? "Paid in full" : `Remaining: Rs ${remaining}`;
          const statusColor = remaining === 0 ? "green" : "red";

          return (
            <ThemedView key={userId} style={styles.userGroup}>
              <ThemedText style={styles.userName}>
                👤 {orders[0].userName}
              </ThemedText>
              <TouchableOpacity onPress={() => toggleUserExpansion(+userId)}>
                <ThemedText style={{ color: "#007bff", marginBottom: 10 }}>
                  {isExpanded ? "Hide Orders" : `Orders (${orders.length})`}
                </ThemedText>
              </TouchableOpacity>

              {isExpanded && (
                <>
                  {orders.map((order) => (
                    <ThemedView key={order.id} style={styles.orderItem}>
                      <ThemedText
                        style={[styles.orderText, { color: undefined }]}
                      >
                        {" "}
                        {/* ensure correct contrast */}
                        Order ID #{order.id} - Rs {order.total_amount} (Paid: Rs{" "}
                        {order.paid_amount})
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: "gray" }}>
                        ⏰ {formatTime(order.date)}
                      </ThemedText>
                    </ThemedView>
                  ))}

                  <ThemedText style={{ fontWeight: "bold", marginTop: 5 }}>
                    Total: Rs {total} | Paid: Rs {paid}
                  </ThemedText>
                  <ThemedText
                    style={{ color: statusColor, fontWeight: "bold" }}
                  >
                    {statusText}
                  </ThemedText>
                </>
              )}
            </ThemedView>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  dateLabel: { fontSize: 16, marginVertical: 10 },
  noData: { marginTop: 20, fontSize: 16 },
  userGroup: { marginBottom: 20 },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  orderItem: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  orderText: { fontSize: 14 },
});

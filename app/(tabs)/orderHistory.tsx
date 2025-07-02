import { Collapsible } from "@/components/Collapsible";
import { ThemedText } from "@/components/ThemedText";
import { DATE_FORMAT_FOR_SHOW } from "@/constants/constants";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import {
  Button,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const colorScheme = useColorScheme() ?? "light";
  const styles = getStyles(colorScheme);

  const todayDate = dayjs().toDate();

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

    const rawOrders = await db.getAllAsync<any>(
      `SELECT 
        u.id AS userId,
        u.name AS userName,
        u.employeeId AS employeeId,
        o.id AS orderId,
        o.order_date,
        o.order_time,
        o.total_amount,
        o.paid_amount,
        i.name AS itemName,
        i.amount AS itemAmount,
        oi.quantity
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN items i ON i.id = oi.item_id
      WHERE o.order_date = ?
      ORDER BY u.id, o.id`,
      [dateStr]
    );

    const grouped: any = {};

    for (const row of rawOrders) {
      if (!grouped[row.userId]) {
        grouped[row.userId] = {
          userId: row.userId,
          userName: row.userName,
          employeeId: row.employeeId,
          orders: [],
          totalAmount: 0,
          totalPaid: 0,
        };
      }

      const user = grouped[row.userId];

      let order = user.orders.find((o: any) => o.orderId === row.orderId);
      if (!order) {
        order = {
          orderId: row.orderId,
          order_date: row.order_date,
          order_time: row.order_time,
          total_amount: row.total_amount,
          paid_amount: row.paid_amount,
          items: [],
        };
        user.orders.push(order);

        user.totalAmount += row.total_amount;
        user.totalPaid += row.paid_amount;
      }

      order.items.push({
        name: row.itemName,
        quantity: row.quantity,
        amount: row.itemAmount,
      });
    }

    setOrders(Object.values(grouped));
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      setSelectedDate(selected);
      fetchOrders(selected);
    }
  };

  const renderOrder = (order: any) => {
    const diff = order.paid_amount - order.total_amount;
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
      <View key={order.orderId} style={styles.orderBox}>
        <Text style={styles.orderTitle}>
          🧾 Order #{order.orderId} - {order.order_date} {order.order_time}
        </Text>
        <Text>Total: Rs {order.total_amount}</Text>
        <Text>Paid: Rs {order.paid_amount}</Text>
        <Text>Items:</Text>
        {order.items.map((item: any, index: number) => (
          <Text key={index}>
            • {item.name} x {item.quantity} (Rs {item.amount})
          </Text>
        ))}
        <Text style={{ color: statusColor, fontWeight: "bold" }}>
          {statusText}
        </Text>
      </View>
    );
  };

  const renderUser = ({ item }: { item: any }) => {
    const totalAmount = item.orders.reduce(
      (sum: number, order: any) => sum + order.total_amount,
      0
    );
    const totalPaid = item.orders.reduce(
      (sum: number, order: any) => sum + order.paid_amount,
      0
    );

    const diff = totalPaid - totalAmount;
    let overallStatus = "Paid in full";
    let statusColor = "green";

    if (diff < 0) {
      overallStatus = `Remaining: Rs ${Math.abs(diff)}`;
      statusColor = "red";
    } else if (diff > 0) {
      overallStatus = `Advance: Rs ${diff}`;
      statusColor = "orange";
    }

    return (
      <View style={styles.userBox}>
        <Collapsible
          title={
            `👤 ${item.userName} (${item.employeeId})\n` +
            `\u2022 Total: Rs ${totalAmount}\n` +
            `\u2022 ${overallStatus}`
          }
          titleStyle={{ color: statusColor, lineHeight: 22 }}
        >
          {item.orders.map(renderOrder)}
        </Collapsible>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedText style={styles.title}>Order History</ThemedText>

      <View style={styles.dateRow}>
        <ThemedText style={styles.label}>
          📅 Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
        </ThemedText>
        <Button title="Select Date" onPress={() => setShowDatePicker(true)} />
      </View>

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
          keyExtractor={(item) => item.userId.toString()}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme === "light" ? "#fff" : "#121212",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme === "light" ? "#000" : "#fff",
    },
    dateRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    label: { fontSize: 16, color: theme === "light" ? "#000" : "#ddd" },
    noOrders: { marginTop: 20, fontSize: 16, color: "gray" },
    userBox: {
      backgroundColor: theme === "light" ? "#f9f9f9" : "#1c1c1c",
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme === "light" ? "#ccc" : "#444",
    },
    orderBox: {
      backgroundColor: theme === "light" ? "#fff" : "#2c2c2c",
      padding: 12,
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme === "light" ? "#ccc" : "#555",
    },
    orderTitle: {
      fontWeight: "600",
      marginBottom: 5,
      color: theme === "light" ? "#000" : "#fff",
    },
  });

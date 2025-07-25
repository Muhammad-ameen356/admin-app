import { Collapsible } from "@/components/Collapsible";
import { ThemedText } from "@/components/ThemedText";
import { DATE_FORMAT_FOR_SHOW } from "@/constants/constants";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

export default function OrderHistoryScreen() {
  const initialStartDate = dayjs().startOf("month").toDate();
  const initialEndDate = dayjs().toDate();

  const [orders, setOrders] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const colorScheme = useColorScheme() ?? "light";
  const styles = getStyles(colorScheme);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        fetchOrders(startDate, endDate);
      })();
      return () => {
        // cleanup on blur
        setSearchQuery("");
        setStartDate(initialStartDate);
        setEndDate(initialEndDate);
      };
    }, [])
  );

  const fetchOrders = async (start: Date, end: Date) => {
    const startDateStr = dayjs(start).format(DATE_FORMAT_FOR_DB);
    const endDateStr = dayjs(end).format(DATE_FORMAT_FOR_DB);

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
      WHERE o.order_date BETWEEN ? AND ?
      ORDER BY u.id, o.id`,
      [startDateStr, endDateStr]
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

  const onStartDateChange = (event: any, selected?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selected) {
      setStartDate(selected);
      fetchOrders(selected, endDate);
    }
  };

  const onEndDateChange = (event: any, selected?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selected) {
      setEndDate(selected);
      fetchOrders(startDate, selected);
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

  const filteredOrders = orders.filter((user: any) =>
    user.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <TextInput
        placeholder="Search By Name"
        placeholderTextColor="gray"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{
          borderColor: "gray",
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          color: colorScheme === "light" ? "black" : "white",
        }}
      />

      <View style={styles.dateRow}>
        <View>
          <TouchableOpacity onPress={() => setShowStartPicker(true)}>
            <ThemedText style={styles.label}>
              📅 Start: {dayjs(startDate).format(DATE_FORMAT_FOR_SHOW)}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity onPress={() => setShowEndPicker(true)}>
            <ThemedText style={styles.label}>
              📅 End: {dayjs(endDate).format(DATE_FORMAT_FOR_SHOW)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={onEndDateChange}
        />
      )}

      {filteredOrders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found for this range.</Text>
      ) : (
        <FlatList
          data={filteredOrders}
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
      paddingHorizontal: 20,
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
      marginVertical: 10,
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DATE_FORMAT_FOR_SHOW } from "@/constants/constants";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import { Button, FlatList, Platform, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

export default function OrderSummaryScreen() {
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const todayDate = dayjs().toDate(); // Returns a JS Date object

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSelectedDate(todayDate);
        db = await openDatabaseAsync(dbName, {
          useNewConnection: true,
        });
        fetchSummary(todayDate);
      })();
    }, [])
  );

  const fetchSummary = async (date: Date) => {
    const dateStr = dayjs(date).format(DATE_FORMAT_FOR_DB);

    const result = await db.getAllAsync<any>(
      `SELECT items.name, SUM(order_items.quantity) as total
       FROM order_items
       JOIN orders ON order_items.order_id = orders.id
       JOIN items ON order_items.item_id = items.id
       WHERE orders.order_date = ?
       GROUP BY items.name`,
      [dateStr]
    );

    setSummary(result);
  };

  const onChangeDate = (event: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) {
      setSelectedDate(selected);
      fetchSummary(selected);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedText style={styles.title}>Order Summary</ThemedText>

      <ThemedText style={styles.dateLabel}>
        📅 Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
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

      {summary.length === 0 ? (
        <ThemedText style={styles.noData}>No orders found.</ThemedText>
      ) : (
        <FlatList
          data={summary}
          keyExtractor={(item, index) => index.toString()} // or use a unique ID if available
          contentContainerStyle={{ paddingBottom: 20 }} // optional
          renderItem={({ item }) => (
            <ThemedView style={styles.itemRow}>
              <Text style={styles.itemText}>
                🍽 {item.name}: {item.total}
              </Text>
            </ThemedView>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  dateLabel: { fontSize: 16, marginVertical: 10 },
  noData: { marginTop: 20, fontSize: 16 },
  itemRow: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  itemText: { fontSize: 16, fontWeight: "600" },
});

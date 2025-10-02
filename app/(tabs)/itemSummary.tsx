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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

export default function OrderSummaryScreen() {
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const colorScheme = useColorScheme() ?? "light";
  const styles = getStyles(colorScheme);

  const todayDate = dayjs().toDate();

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

  const SummaryItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <ThemedText style={styles.itemText}>{item.name}</ThemedText>
      <View style={styles.badge}>
        <ThemedText style={styles.badgeText}>{item.total}</ThemedText>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ThemedText style={styles.title}>Order Summary</ThemedText>
      <TouchableOpacity onPress={() => setShowPicker(true)}>
        <ThemedText style={styles.dateLabel}>
          Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
        </ThemedText>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      <FlatList
        data={summary}
        ListEmptyComponent={
          <ThemedText style={styles.noData}>No Item Found.</ThemedText>
        }
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => <SummaryItem item={item} />}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      paddingTop: 20,
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: theme === "light" ? "#f9fafb" : "#111827",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 24,
      color: theme === "light" ? "#1f2937" : "#f3f4f6",
      letterSpacing: -0.5,
    },
    dateLabel: {
      fontSize: 16,
      color: theme === "light" ? "#1f2937" : "#f3f4f6",
      marginBottom: 16,
      fontWeight: "600",
      backgroundColor: theme === "light" ? "#ffffff" : "#1f2937",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme === "light" ? "#e5e7eb" : "#374151",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    noData: {
      marginTop: 40,
      fontSize: 16,
      color: theme === "light" ? "#6b7280" : "#9ca3af",
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme === "light" ? "#ffffff" : "#1f2937",
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme === "light" ? "#e5e7eb" : "#374151",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    itemText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      flex: 1,
      letterSpacing: -0.2,
    },
    quantityText: {
      fontSize: 15,
      fontWeight: "bold",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      marginLeft: 10,
    },
    badge: {
      backgroundColor: theme === "dark" ? "#2563eb" : "#2563eb",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      minWidth: 36,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#2563eb",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    badgeText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
  });

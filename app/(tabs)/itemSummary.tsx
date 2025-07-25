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
      <ThemedText style={styles.itemText}>🍽 {item.name}</ThemedText>
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
          📅 Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
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
        showsVerticalScrollIndicator={true}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: colorScheme === "dark" ? "#333" : "#ccc",
              marginVertical: 4,
            }}
          />
        )}
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
      paddingTop: 18,
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: theme === "light" ? "#fff" : "#121212",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 18,
      color: theme === "light" ? "#000" : "#fff",
    },
    dateLabel: {
      fontSize: 17,
      color: theme === "light" ? "#000" : "#ddd",
      marginBottom: 10,
      fontWeight: "800",
    },
    noData: {
      marginTop: 20,
      fontSize: 16,
      color: theme === "light" ? "#333" : "#bbb",
    },

    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 4,
    },

    itemText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme === "dark" ? "#fff" : "#000",
      flex: 1,
    },

    quantityText: {
      fontSize: 15,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : "#000",
      marginLeft: 10,
    },

    badge: {
      backgroundColor: theme === "dark" ? "#3b82f6" : "#007bff", // blue
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 50,
      minWidth: 28,
      alignItems: "center",
      justifyContent: "center",
    },

    badgeText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 14,
    },
  });

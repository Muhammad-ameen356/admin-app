import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DATE_FORMAT_FOR_SHOW } from "@/constants/constants";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import { Button, FlatList, Platform, StyleSheet, View } from "react-native";
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
    <ThemedView style={styles.card}>
      <ThemedView style={styles.cardContent}>
        <ThemedText style={styles.itemName}>🍽 {item.name}</ThemedText>
        <View style={styles.totalBadge}>
          <ThemedText style={styles.totalBadgeText}>{item.total}</ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ThemedText style={styles.title}>Order Summary</ThemedText>

      <ThemedText style={styles.dateLabel}>
        📅 Date: {dayjs(selectedDate).format(DATE_FORMAT_FOR_SHOW)}
      </ThemedText>
      <View style={{ marginBottom: 10 }}>
        <Button title="Select Date" onPress={() => setShowPicker(true)} />
      </View>

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
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => <SummaryItem item={item} />}
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
    dateLabel: {
      fontSize: 16,
      marginVertical: 10,
      color: theme === "light" ? "#000" : "#ddd",
    },
    noData: {
      marginTop: 20,
      fontSize: 16,
      color: theme === "light" ? "#333" : "#bbb",
    },
    card: {
      backgroundColor: theme === "light" ? "#fff" : "#000",
      borderColor: theme === "light" ? "#ddd" : "#444",
      borderWidth: 1,
      padding: 12,
      marginBottom: 10,
      borderRadius: 8,
    },

    cardText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme === "light" ? "#000" : "#fff",
    },

    cardContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    itemName: {
      fontSize: 16,
      fontWeight: "600",
      flex: 1,
      color: theme === "light" ? "#000" : "#fff",
    },

    totalBadge: {
      backgroundColor: theme === "light" ? "#007bff" : "#3b82f6",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 50,
      minWidth: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    totalBadgeText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
    },
  });

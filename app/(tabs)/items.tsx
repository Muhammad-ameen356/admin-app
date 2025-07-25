import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Item = {
  id: number;
  name: string;
  amount: number;
};

let db: SQLiteDatabase;

export default function ItemScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const styles = getStyles(colorScheme);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [searchName, setSearchName] = useState("");
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  const reset = () => {
    setName("");
    setAmount("");
    setSearchName("");
    setEditingId(null);
  };

  useEffect(() => {
    (async () => {
      db = await openDatabaseAsync(dbName, {
        useNewConnection: true,
      });
      await loadItemsFromDB();
    })();
    return () => {
      reset();
    };
  }, []);

  const loadItemsFromDB = async () => {
    try {
      const rows = await db.getAllAsync<Item>("SELECT * FROM items");
      const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
      setItems(sorted);
      setFilteredItems(sorted);
    } catch (err) {
      Alert.alert("Error", "Could not load items from database.");
      console.error("Load error:", err);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !amount.trim()) {
      Alert.alert("Please fill in all fields");
      return;
    }

    try {
      const amt = parseInt(amount);
      if (isNaN(amt)) throw new Error();

      if (editingId) {
        await db.runAsync(
          "UPDATE items SET name = ?, amount = ? WHERE id = ?",
          [name.trim(), amt, editingId]
        );
        Alert.alert("Updated successfully");
      } else {
        await db.runAsync("INSERT INTO items (name, amount) VALUES (?, ?)", [
          name.trim(),
          amt,
        ]);
        Alert.alert("Item added");
      }

      await loadItemsFromDB();
      reset();
    } catch (err) {
      console.error("Save Error:", err);
      Alert.alert("Invalid amount");
    }
  };

  const handleEdit = (item: Item) => {
    setName(item.name);
    setAmount(item.amount.toString());
    setEditingId(item.id);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Confirm Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await db.runAsync("DELETE FROM items WHERE id = ?", [id]);
            await loadItemsFromDB();
            reset();
          } catch (err) {
            console.error("Delete Error:", err);
            Alert.alert("Failed to delete");
            reset();
          }
        },
      },
    ]);
  };

  const cancelEdit = () => {
    reset();
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchName.trim()) {
        const filtered = items.filter((item) =>
          item.name.toLowerCase().includes(searchName.toLowerCase())
        );
        setFilteredItems(filtered);
      } else {
        setFilteredItems(items);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchName, items]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ThemedText style={styles.title}>Manage Items</ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Item Name"
        placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#888"}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSearchName(text);
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#888"}
        value={amount}
        onChangeText={(text) => {
          // Allow only digits (remove -, letters, etc.)
          const digitsOnly = text.replace(/[^0-9]/g, "");
          setAmount(digitsOnly);
        }}
        keyboardType="numeric"
      />

      <ThemedView style={styles.buttonRow}>
        <Button
          title={editingId ? "Update Item" : "Add Item"}
          onPress={handleSave}
        />
        {editingId && (
          <Button title="Cancel" color="gray" onPress={cancelEdit} />
        )}
      </ThemedView>

      <FlatList
        data={editingId ? items : filteredItems}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found</Text>
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedView style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
              <ThemedText style={styles.cardAmount}>
                Rs {item.amount}
              </ThemedText>
            </ThemedView>
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={styles.iconButton}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.iconButton}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </ThemedView>
        )}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      paddingTop: 18,
      paddingHorizontal: 20,
      flex: 1,
      backgroundColor: theme === "dark" ? "#121212" : "#fff",
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme === "dark" ? "#fff" : "#000",
    },
    input: {
      borderWidth: 1,
      borderColor: theme === "dark" ? "#555" : "#ccc",
      padding: 12,
      borderRadius: 8,
      marginBottom: 10,
      color: theme === "dark" ? "#fff" : "#000",
      backgroundColor: theme === "dark" ? "#1e1e1e" : "#fff",
    },
    buttonRow: {
      marginBottom: 20,
    },

    emptyText: {
      textAlign: "center",
      color: theme === "dark" ? "#aaa" : "#888",
    },

    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1f1f1f" : "#fafafa",
      paddingHorizontal: 15,
      paddingVertical: 4,
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme === "dark" ? "#333" : "#ddd",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: "bold",
      marginBottom: 4,
      color: theme === "dark" ? "#fff" : "#222",
    },

    cardAmount: {
      fontSize: 15,
      color: theme === "dark" ? "#aaa" : "#666",
    },

    iconButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },

    editIcon: {
      fontSize: 20,
      color: "#007bff",
    },

    deleteIcon: {
      fontSize: 20,
      color: "#d11a2a",
    },
  });

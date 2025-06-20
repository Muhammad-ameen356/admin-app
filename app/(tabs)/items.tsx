// app/(tabs)/items.tsx

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/DBConstants";
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
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      db = await openDatabaseAsync(dbName, {
        useNewConnection: true,
      });
      await loadItems();
    })();
  }, []);

  const loadItems = async () => {
    const rows = await db.getAllAsync<Item>("SELECT * FROM items");
    setItems(rows);
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

      setName("");
      setAmount("");
      setEditingId(null);
      await loadItems();
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
            await loadItems();
          } catch (err) {
            console.error("Delete Error:", err);
            Alert.alert("Failed to delete");
          }
        },
      },
    ]);
  };

  const cancelEdit = () => {
    setName("");
    setAmount("");
    setEditingId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView>
        <ThemedText style={styles.title}>Manage Items</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Item Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
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
          data={items}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text>No items found</Text>}
          renderItem={({ item }) => (
            <ThemedView style={styles.itemRow}>
              <ThemedView style={{ flex: 1 }}>
                <ThemedText style={styles.itemText}>{item.name}</ThemedText>
                <ThemedText style={styles.itemSub}>Rs {item.amount}</ThemedText>
              </ThemedView>
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <ThemedText style={styles.editBtn}>✏️</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <ThemedText style={styles.deleteBtn}>🗑️</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f3f3",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  itemText: { fontSize: 16, fontWeight: "600" },
  itemSub: { color: "#555" },
  editBtn: { fontSize: 18, color: "blue", marginRight: 10 },
  deleteBtn: { fontSize: 18, color: "red" },
});

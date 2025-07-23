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

// Type for User
type User = {
  id: number;
  name: string;
  employeeId: number;
};

let db: SQLiteDatabase;

export default function UserCrudScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const styles = getStyles(colorScheme);

  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      db = await openDatabaseAsync(dbName, {
        useNewConnection: true,
      });

      await loadUsers();
    })();
  }, []);

  const loadUsers = async () => {
    try {
      const rows = await db.getAllAsync<User>(
        "SELECT * FROM users ORDER BY id DESC"
      );
      setUsers(rows);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const empIdNum = parseInt(employeeId);

    if (!trimmedName || isNaN(empIdNum)) {
      Alert.alert(
        "Validation",
        "Name and a valid numeric Employee ID are required."
      );
      return;
    }

    try {
      if (editingId === null) {
        await db.runAsync(
          "INSERT INTO users (name, employeeId) VALUES (?, ?)",
          [trimmedName, empIdNum]
        );
        Alert.alert("Success", "User added.");
      } else {
        await db.runAsync(
          "UPDATE users SET name = ?, employeeId = ? WHERE id = ?",
          [trimmedName, empIdNum, editingId]
        );
        Alert.alert("Updated", "User updated.");
      }

      setName("");
      setEmployeeId("");
      setEditingId(null);
      await loadUsers();
    } catch (error: any) {
      setName("");
      setEmployeeId("");
      if (
        error.message.includes("UNIQUE constraint failed") &&
        error.message.includes("users.employeeId")
      ) {
        return Alert.alert("Error: This employee ID is already in use.");
      } else {
        return Alert.alert("An unexpected error occurred: " + error.message);
      }
    }
  };

  const handleEdit = (user: User) => {
    setName(user.name);
    setEmployeeId(user.employeeId.toString());
    setEditingId(user.id);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
              Alert.alert("Deleted", "User removed.");
              await loadUsers();
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Could not delete user.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const cancelEdit = () => {
    setName("");
    setEmployeeId("");
    setEditingId(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ThemedText style={styles.title}>
        {editingId ? "Edit User" : "Add User"}
      </ThemedText>

      <TextInput
        placeholder="Enter Name"
        placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#999"}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Enter Employee ID"
        placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#999"}
        value={employeeId}
        onChangeText={(text) => {
          // Allow only digits (remove -, letters, etc.)
          const digitsOnly = text.replace(/[^0-9]/g, "");
          setEmployeeId(digitsOnly);
        }}
        keyboardType="numeric"
        style={styles.input}
      />

      <ThemedView style={{ marginBottom: 20 }}>
        <ThemedView>
          <Button title={editingId ? "Update" : "Add"} onPress={handleSave} />
        </ThemedView>
        <ThemedView>
          {editingId !== null && (
            <Button title="Cancel" onPress={cancelEdit} color="gray" />
          )}
        </ThemedView>
      </ThemedView>
      <FlatList
        data={users}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedView style={{ flex: 1 }}>
              <ThemedText style={styles.cardTitle}>{item.name}</ThemedText>
              <ThemedText style={styles.cardSubTitle}>
                Employee ID: {item.employeeId}
              </ThemedText>
            </ThemedView>
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={styles.iconButton}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            {/* Uncomment to enable delete */}
            {/* <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
      <Text style={styles.deleteIcon}>🗑️</Text>
    </TouchableOpacity> */}
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
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme === "dark" ? "#fff" : "#000",
    },
    subTitle: {
      padding: 10,
      fontSize: 18,
      fontWeight: "600",

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
    row: {
      padding: 12,
      borderBottomWidth: 1,
      borderColor: theme === "dark" ? "#444" : "#eee",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actions: { flexDirection: "row", gap: 10 },
    edit: { color: "#007bff" },
    delete: { color: "#d11a2a" },
    empty: {
      textAlign: "center",
      color: theme === "dark" ? "#aaa" : "#888",
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1f1f1f" : "#f9f9f9",
      padding: 15,
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme === "dark" ? "#333" : "#ddd",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: "bold",
      marginBottom: 4,
      color: theme === "dark" ? "#fff" : "#222",
    },

    cardSubTitle: {
      fontSize: 14,
      color: theme === "dark" ? "#bbb" : "#666",
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

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/DBConstants";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
        {
          text: "Cancel",
          style: "cancel",
        },
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ThemedText style={styles.title}>
          {editingId ? "Edit User" : "Add User"}
        </ThemedText>

        <TextInput
          placeholder="Enter Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Enter Employee ID"
          value={employeeId}
          onChangeText={setEmployeeId}
          keyboardType="numeric"
          style={styles.input}
        />

        <ThemedView style={styles.buttonGroup}>
          <Button title={editingId ? "Update" : "Add"} onPress={handleSave} />
          {editingId !== null && (
            <Button title="Cancel" onPress={cancelEdit} color="gray" />
          )}
        </ThemedView>

        <ThemedText style={styles.subTitle}>Users</ThemedText>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
          renderItem={({ item }) => (
            <ThemedView style={styles.row}>
              <ThemedText>
                {item.name} (Emp ID: {item.employeeId})
              </ThemedText>
              <ThemedView style={styles.actions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <ThemedText style={styles.edit}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <ThemedText style={styles.delete}>Delete</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  subTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 30,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonGroup: { flexDirection: "row", gap: 10 },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: { flexDirection: "row", gap: 10 },
  edit: { color: "#007bff" },
  delete: { color: "#d11a2a" },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
});

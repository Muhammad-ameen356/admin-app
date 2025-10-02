import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchName, setSearchName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const reset = () => {
    setName("");
    setEmployeeId("");
    setSearchName("");
    setEditingId(null);
  };

  useEffect(() => {
    (async () => {
      db = await openDatabaseAsync(dbName, {
        useNewConnection: true,
      });

      await loadUsersFromDB();
    })();
    return () => {
      reset();
    };
  }, []);

  const loadUsersFromDB = async () => {
    try {
      const rows = await db.getAllAsync<User>(
        "SELECT * FROM users ORDER BY id DESC"
      );

      const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
      setUsers(sorted);

      setFilteredUsers(sorted);
    } catch (err) {
      Alert.alert("Error", "Could not load users from database.");
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

      reset();
      await loadUsersFromDB();
    } catch (error: any) {
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

  // const handleDelete = (id: number) => {
  //   Alert.alert(
  //     "Confirm Delete",
  //     "Are you sure you want to delete this user?",
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Yes",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
  //             Alert.alert("Deleted", "User removed.");
  //             await loadUsersFromDB();
  //           } catch (err) {
  //             console.error("Delete error:", err);
  //             Alert.alert("Error", "Could not delete user.");
  //           }
  //         },
  //       },
  //     ],
  //     { cancelable: true }
  //   );
  // };

  const cancelEdit = () => {
    reset();
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchName.trim()) {
        const filtered = users.filter((item) =>
          item.name.toLowerCase().includes(searchName.toLowerCase())
        );
        setFilteredUsers(filtered);
      } else {
        setFilteredUsers(users);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchName, users]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ThemedText style={styles.title}>
        {editingId ? "Edit User" : "Add User"}
      </ThemedText>

      <TextInput
        placeholder="Enter Name"
        placeholderTextColor={colorScheme === "dark" ? "#aaa" : "#999"}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSearchName(text);
        }}
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

      <ThemedView style={{ marginBottom: 24, gap: 8 }}>
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: editingId ? "#f59e0b" : "#2563eb",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            {editingId ? "Update User" : "Add User"}
          </Text>
        </TouchableOpacity>
        {editingId !== null && (
          <TouchableOpacity
            onPress={cancelEdit}
            style={{
              backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colorScheme === "dark" ? "#f3f4f6" : "#1f2937",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </ThemedView>
      <FlatList
        data={editingId ? users : filteredUsers}
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
              style={[
                styles.iconButton,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(37, 99, 235, 0.15)"
                      : "rgba(37, 99, 235, 0.1)",
                },
              ]}
            >
              <Text style={styles.editIcon}>✏️</Text>
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
      paddingTop: 20,
      paddingHorizontal: 16,
      flex: 1,
      backgroundColor: theme === "dark" ? "#111827" : "#f9fafb",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 24,
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      letterSpacing: -0.5,
    },
    subTitle: {
      padding: 10,
      fontSize: 18,
      fontWeight: "600",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
    },
    input: {
      borderWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      fontSize: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    row: {
      padding: 12,
      borderBottomWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actions: { flexDirection: "row", gap: 10 },
    edit: { color: "#2563eb" },
    delete: { color: "#ef4444" },
    empty: {
      textAlign: "center",
      color: theme === "dark" ? "#9ca3af" : "#6b7280",
      fontSize: 15,
      marginTop: 20,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 6,
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      letterSpacing: -0.3,
    },
    cardSubTitle: {
      fontSize: 14,
      color: theme === "dark" ? "#9ca3af" : "#6b7280",
      fontWeight: "500",
    },
    iconButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 4,
    },
    editIcon: {
      fontSize: 22,
      color: "#2563eb",
    },
    deleteIcon: {
      fontSize: 22,
      color: "#ef4444",
    },
  });

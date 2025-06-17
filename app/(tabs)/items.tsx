// // app/(tabs)/items.tsx

// import { dbName } from "@/constants/constants";
// import { useThemeColor } from "@/hooks/useThemeColor";
// import * as SQLite from "expo-sqlite";
// import React, { useEffect, useState } from "react";
// import {
//   Alert,
//   Button,
//   FlatList,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from "react-native";

// type Item = {
//   id: number;
//   name: string;
// };

// export default function ItemScreen() {
//   const [inputValue, setInputValue] = useState("");
//   const [items, setItems] = useState<Item[]>([]);
//   const [isEditing, setIsEditing] = useState(false);
//   const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
//   const [editedName, setEditedName] = useState("");

//   const inputTextColor = useThemeColor({}, "text");
//   const inputBgColor = useThemeColor({}, "background");
//   const placeholderColor = useThemeColor({}, "text");

//   useEffect(() => {
//     const initDb = async () => {
//       const db = await SQLite.openDatabaseAsync(dbName);
//       await db.execAsync(`
//         CREATE TABLE IF NOT EXISTS items (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           name TEXT NOT NULL
//         );
//       `);
//       fetchItems();
//     };
//     initDb();
//   }, []);

//   const addItem = async () => {
//     if (!inputValue.trim()) {
//       Alert.alert("Please enter an item name");
//       return;
//     }

//     const db = await SQLite.openDatabaseAsync(dbName);
//     await db.runAsync("INSERT INTO items (name) VALUES (?)", inputValue.trim());

//     setInputValue("");
//     fetchItems();
//   };

//   const fetchItems = async () => {
//     const db = await SQLite.openDatabaseAsync(dbName);
//     const result = await db.getAllAsync("SELECT * FROM items");
//     setItems(result as Item[]);
//   };

//   const debugPrintItems = async () => {
//     const db = await SQLite.openDatabaseAsync(dbName);
//     const result = await db.getAllAsync("SELECT * FROM items");
//     console.log("Items in DB:", result);
//   };

//   const toggleEditMode = () => {
//     setIsEditing((prev) => !prev);
//     setSelectedItemId(null);
//     setEditedName("");
//   };

//   const updateItem = async () => {
//     if (!editedName.trim() || selectedItemId === null) return;

//     const db = await SQLite.openDatabaseAsync(dbName);
//     await db.runAsync(
//       "UPDATE items SET name = ? WHERE id = ?",
//       editedName.trim(),
//       selectedItemId
//     );

//     setSelectedItemId(null);
//     setEditedName("");
//     fetchItems();
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Item Summary</Text>

//       <TextInput
//         placeholder="Enter item name"
//         value={inputValue}
//         onChangeText={setInputValue}
//         placeholderTextColor={placeholderColor}
//         style={[
//           styles.input,
//           { color: inputTextColor, backgroundColor: inputBgColor },
//         ]}
//       />

//       <Button title="➕ Add Item" onPress={addItem} />
//       <Button title="📤 Export DB" onPress={debugPrintItems} />
//       <Button
//         title={isEditing ? "✅ Save Changes" : "✏️ Edit Items"}
//         onPress={isEditing ? updateItem : toggleEditMode}
//       />

//       <FlatList
//         data={items}
//         keyExtractor={(item) => item.id.toString()}
//         style={styles.list}
//         renderItem={({ item }) => (
//           <View style={styles.itemBox}>
//             {isEditing && selectedItemId === item.id ? (
//               <>
//                 <TextInput
//                   style={styles.input}
//                   value={editedName}
//                   onChangeText={setEditedName}
//                   placeholder="Edit name"
//                 />
//                 <Button title="💾 Save" onPress={updateItem} />
//               </>
//             ) : (
//               <>
//                 <Text style={styles.itemText}>📝 {item.name}</Text>
//                 {isEditing && (
//                   <Button
//                     title="✏️"
//                     onPress={() => {
//                       setSelectedItemId(item.id);
//                       setEditedName(item.name);
//                     }}
//                   />
//                 )}
//               </>
//             )}
//           </View>
//         )}
//       />
//     </View>
//   );
// }
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     paddingTop: 50,
//   },
//   title: {
//     fontSize: 22,
//     marginBottom: 20,
//     fontWeight: "bold",
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     marginBottom: 10,
//     borderRadius: 6,
//   },
//   list: {
//     marginTop: 20,
//   },
//   itemBox: {
//     backgroundColor: "#f0f0f0",
//     padding: 12,
//     marginBottom: 8,
//     borderRadius: 6,
//   },
//   itemText: {
//     fontSize: 16,
//   },
// });

import { dbName } from "@/constants/constants";
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
  View,
} from "react-native";

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
      db = await openDatabaseAsync(dbName);
      await createTable();
      await loadItems();
    })();
  }, []);

  const createTable = async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL
      );
    `);
  };

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
    <View style={styles.container}>
      <Text style={styles.title}>Manage Items</Text>

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

      <View style={styles.buttonRow}>
        <Button
          title={editingId ? "Update Item" : "Add Item"}
          onPress={handleSave}
        />
        {editingId && (
          <Button title="Cancel" color="gray" onPress={cancelEdit} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text>No items found</Text>}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={styles.itemSub}>Rs {item.amount}</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Text style={styles.editBtn}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteBtn}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
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

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
import DropDownPicker from "react-native-dropdown-picker";

let db: SQLiteDatabase;

type User = { id: number; name: string; employeeId: number };
type Item = { id: number; name: string; amount: number };
type OrderItemInput = { itemId: number | null; quantity: number; dropdownOpen?: boolean };

export default function TakeOrderScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([{
    itemId: null,
    quantity: 1,
    dropdownOpen: false
  }]);
  const [paidAmount, setPaidAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      db = await openDatabaseAsync(dbName);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          date TEXT DEFAULT (DATE('now')),
          total_amount INTEGER,
          paid_amount INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER,
          item_id INTEGER,
          quantity INTEGER NOT NULL,
          FOREIGN KEY(order_id) REFERENCES orders(id),
          FOREIGN KEY(item_id) REFERENCES items(id)
        );
      `);

      await loadUsers();
      await loadItems();
      await loadOrders();
    })();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [orderItems]);

  const loadUsers = async () => {
    const res = await db.getAllAsync<User>("SELECT * FROM users");
    setUsers(res);
  };

  const loadItems = async () => {
    const res = await db.getAllAsync<Item>("SELECT * FROM items");
    setItems(res);
  };

  const loadOrders = async () => {
    const date = new Date().toISOString().split("T")[0];
    const res = await db.getAllAsync<any>(
      `SELECT orders.id, users.name as userName, orders.total_amount, orders.paid_amount
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.date = ?`,
      [date]
    );
    setOrders(res);
  };

  const calculateTotal = () => {
    let total = 0;
    for (const orderItem of orderItems) {
      const item = items.find((i) => i.id === orderItem.itemId);
      if (item) total += item.amount * orderItem.quantity;
    }
    setTotalAmount(total);
  };

  const handleItemChange = (index: number, field: "itemId" | "quantity", value: any) => {
    const updated = [...orderItems];
    updated[index][field] = field === "quantity" ? parseInt(value) || 1 : value;
    setOrderItems(updated);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { itemId: null, quantity: 1, dropdownOpen: false }]);
  };

  const removeOrderItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleSaveOrder = async () => {
    if (!selectedUserId) return Alert.alert("Select User");
    if (orderItems.length === 0 || orderItems.some((item) => item.itemId === null))
      return Alert.alert("Select at least one valid item");

    const paid = parseInt(paidAmount) || 0;
    if (paid > totalAmount) return Alert.alert("Paid amount cannot exceed total amount");

    try {
      const date = new Date().toISOString().split("T")[0];
      const result = await db.runAsync(
        "INSERT INTO orders (user_id, date, total_amount, paid_amount) VALUES (?, ?, ?, ?)",
        [selectedUserId, date, totalAmount, paid]
      );

      const orderId = result.lastInsertRowId;

      for (const entry of orderItems) {
        await db.runAsync(
          `INSERT INTO order_items (order_id, item_id, quantity) VALUES (?, ?, ?)`,
          [orderId, entry.itemId, entry.quantity]
        );
      }

      Alert.alert("Order saved");
      resetForm();
      await loadOrders();
    } catch (err) {
      console.error("Save order error:", err);
      Alert.alert("Error saving order");
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setOrderItems([{ itemId: null, quantity: 1, dropdownOpen: false }]);
    setPaidAmount("");
    setTotalAmount(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Take Order</Text>
  
      <Text style={styles.label}>Select User</Text>
      <View style={{ zIndex: 3000 }}>
        <DropDownPicker
          open={userDropdownOpen}
          value={selectedUserId}
          items={[
            { label: "-- Select User --", value: undefined },
            ...users.map((user) => ({
              label: user.name,
              value: user.id,
              key: `user-${user.id}`,
            })),
          ]}
          setOpen={setUserDropdownOpen}
          setValue={setSelectedUserId}
          placeholder="Select User"
          searchable={true}
          zIndex={3000}
          zIndexInverse={1000}
        />
      </View>
  
      <Text style={styles.label}>Items</Text>
      {orderItems.map((item, index) => (
        <View
          key={`${index}-${item.itemId ?? "null"}`}
          style={[styles.itemRow, { zIndex: 2000 - index }]}
        >
          <View style={{ flex: 1 }}>
            <DropDownPicker
              open={item.dropdownOpen || false}
              value={item.itemId}
              items={items.map((i) => ({
                label: `${i.name} - Rs ${i.amount}`,
                value: i.id,
                key: `item-${i.id}`,
              }))}
              setOpen={(open) => {
                const updated = [...orderItems];
                updated[index].dropdownOpen = open;
                setOrderItems(updated);
              }}
              setValue={(callback) => {
                const updated = [...orderItems];
                const newValue = callback(item.itemId);
                updated[index].itemId = newValue;
                setOrderItems(updated);
              }}
              placeholder="Select Item"
              searchable={true}
              zIndex={2000 - index}
              zIndexInverse={4000 + index}
              style={{ flex: 1 }}
              dropDownContainerStyle={{ width: "80%" }}
            />
          </View>
  
          <TextInput
            style={[styles.input, { width: 80, marginLeft: 10 }]}
            placeholder="Qty"
            keyboardType="numeric"
            value={item.quantity.toString()}
            onChangeText={(val) => handleItemChange(index, "quantity", val)}
          />
  
          {index > 0 && (
            <TouchableOpacity onPress={() => removeOrderItem(index)}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
  
      <TouchableOpacity onPress={addOrderItem} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Add Item</Text>
      </TouchableOpacity>
  
      <Text style={styles.total}>Total: Rs {totalAmount}</Text>
  
      <TextInput
        style={styles.input}
        placeholder="Paid Amount"
        keyboardType="numeric"
        value={paidAmount}
        onChangeText={setPaidAmount}
      />
  
      <Button title="Save Order" onPress={handleSaveOrder} />
  
      <Text style={[styles.title, { marginTop: 30 }]}>Todays Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const remaining = item.total_amount - item.paid_amount;
          return (
            <View style={styles.orderItem}>
              <Text style={styles.orderText}>
                👤 {item.userName} - Rs {item.total_amount} (Paid: Rs{" "}
                {item.paid_amount})
              </Text>
              <Text
                style={{
                  color: remaining === 0 ? "green" : "red",
                  fontWeight: "bold",
                }}
              >
                {remaining === 0
                  ? "Paid in full"
                  : `Remaining: Rs ${remaining}`}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text>No orders yet.</Text>}
      />
    </View>
  );
  
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 15 },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  addButton: {
    alignSelf: "flex-start",
    backgroundColor: "#007bff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  remove: { fontSize: 20, color: "red", marginLeft: 10 },
  total: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  orderItem: {
    backgroundColor: "#f1f1f1",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  orderText: {
    fontSize: 14,
  },
});

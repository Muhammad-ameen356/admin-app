import { dbName } from "@/constants/constants";
import { Picker } from "@react-native-picker/picker";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type User = { id: number; name: string; employeeId: number };
type Item = { id: number; name: string; amount: number };

type OrderItemInput = {
  itemId: number | null;
  quantity: number;
};

let db: SQLiteDatabase;

export default function TakeOrderScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { itemId: null, quantity: 1 },
  ]);
  const [paidAmount, setPaidAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);

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

  const handleItemChange = (
    index: number,
    field: "itemId" | "quantity",
    value: any
  ) => {
    const updated = [...orderItems];
    if (field === "quantity") {
      updated[index][field] = parseInt(value) || 1;
    } else {
      updated[index][field] = value;
    }
    setOrderItems(updated);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { itemId: null, quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleSaveOrder = async () => {
    if (!selectedUserId) {
      Alert.alert("Select User");
      return;
    }

    if (
      orderItems.length === 0 ||
      orderItems.some((item) => item.itemId === null)
    ) {
      Alert.alert("Select at least one valid item");
      return;
    }

    const paid = parseInt(paidAmount) || 0;

    if (paid > totalAmount) {
      Alert.alert("Paid amount cannot exceed total amount");
      return;
    }

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
    setOrderItems([{ itemId: null, quantity: 1 }]);
    setPaidAmount("");
    setTotalAmount(0);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Take Order</Text>

      <Text style={styles.label}>Select User</Text>
      <Picker
        selectedValue={selectedUserId}
        onValueChange={(value) => setSelectedUserId(value)}
        style={styles.picker}
      >
        <Picker.Item label="-- Select User --" value={null} />
        {users.map((user) => (
          <Picker.Item key={user.id} label={`${user.name}`} value={user.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Items</Text>
      {orderItems.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Picker
            selectedValue={item.itemId}
            onValueChange={(value) => handleItemChange(index, "itemId", value)}
            style={[styles.picker, { flex: 1 }]}
          >
            <Picker.Item label="Select Item" value={null} />
            {items.map((i) => (
              <Picker.Item
                key={i.id}
                label={`${i.name} - Rs ${i.amount}`}
                value={i.id}
              />
            ))}
          </Picker>

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

      <Text style={[styles.title, { marginTop: 30 }]}>Today's Orders</Text>
      {orders.length === 0 ? (
        <Text>No orders yet.</Text>
      ) : (
        orders.map((order) => {
          const remaining = order.total_amount - order.paid_amount;
          return (
            <View key={order.id} style={styles.orderItem}>
              <Text style={styles.orderText}>
                👤 {order.userName} - Rs {order.total_amount} (Paid: Rs{" "}
                {order.paid_amount})
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
        })
      )}
    </ScrollView>
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

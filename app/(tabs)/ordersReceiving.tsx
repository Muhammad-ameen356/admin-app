import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

let db: SQLiteDatabase;

type User = { id: number; name: string; employeeId: number };
type Item = { id: number; name: string; amount: number };
type OrderItemInput = {
  itemId: number | null;
  quantity: number;
  dropdownOpen?: boolean;
};

export default function TakeOrderScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { itemId: null, quantity: 1, dropdownOpen: false },
  ]);
  const [paidAmount, setPaidAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        await loadUsers();
        await loadItems();
        await loadOrders();
      })();
    }, [])
  );

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
    const date = dayjs().format(DATE_FORMAT_FOR_DB);

    const res = await db.getAllAsync<any>(
      `SELECT orders.id, users.name as userName, orders.order_date, orders.order_time, orders.total_amount, orders.paid_amount
         FROM orders
         JOIN users ON users.id = orders.user_id
         WHERE orders.order_date = ?`,
      [date] // matches any datetime starting with today's date
    );

    console.log(res, "res");
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
    updated[index][field] = field === "quantity" ? parseInt(value) || 1 : value;
    setOrderItems(updated);
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      { itemId: null, quantity: 1, dropdownOpen: false },
    ]);
  };

  const removeOrderItem = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const handleSaveOrder = async () => {
    if (!selectedUserId) return Alert.alert("Select User");
    if (
      orderItems.length === 0 ||
      orderItems.some((item) => item.itemId === null)
    )
      return Alert.alert("Select at least one valid item");

    const paid = parseInt(paidAmount) || 0;

    try {
      const now = dayjs();
      const orderDate = now.format(DATE_FORMAT_FOR_DB);
      const orderTime = now.format("HH:mm:ss");

      const result = await db.runAsync(
        "INSERT INTO orders (user_id, order_date, order_time, total_amount, paid_amount) VALUES (?, ?, ?, ?, ?)",
        [selectedUserId, orderDate, orderTime, totalAmount, paid]
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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      extraScrollHeight={100}
      enableOnAndroid
    >
      <Text style={styles.title}>Take Order</Text>

      <Text style={styles.label}>Select User</Text>
      <DropDownPicker
        listMode="MODAL"
        modalTitle="Select a User"
        open={userDropdownOpen}
        value={selectedUserId}
        items={[
          { label: "-- Select User --", value: undefined },
          ...users.map((user, ind) => ({
            label: user.name,
            value: user.id,
            key: `user-${ind}-${user.id}`,
          })),
        ]}
        setOpen={setUserDropdownOpen}
        setValue={setSelectedUserId}
        placeholder="Select User"
        searchable={true}
      />

      <Text style={styles.label}>Items</Text>
      {orderItems.map((item, index) => (
        <View key={`${index}-${item.itemId ?? "null"}`} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <DropDownPicker
              listMode="MODAL"
              modalTitle="Select an Item"
              open={item.dropdownOpen || false}
              value={item.itemId}
              items={items.map((i, ind) => ({
                label: `${i.name} - Rs ${i.amount}`,
                value: i.id,
                key: `item-${ind}-${i.id}`,
              }))}
              setOpen={(val) => {
                const updated = [...orderItems];
                updated[index].dropdownOpen =
                  typeof val === "function"
                    ? val(updated[index].dropdownOpen ?? false)
                    : val;
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

      <Text style={[styles.label, { marginTop: 30 }]}>Todays Orders</Text>

      {orders.length === 0 ? (
        <Text>No orders yet.</Text>
      ) : (
        orders.map((order) => {
          const diff = order.paid_amount - order.total_amount;
          let statusText = "Paid in full";
          let statusColor = "green";

          if (diff < 0) {
            statusText = `Remaining: Rs ${Math.abs(diff)}`;
            statusColor = "red";
          } else if (diff > 0) {
            statusText = `You have: Rs ${diff} balance`;
            statusColor = "orange";
          }

          return (
            <View key={order.id} style={styles.orderItem}>
              <Text style={styles.orderText}>
                👤 {order.userName} - Rs {order.total_amount} (Paid: Rs{" "}
                {order.paid_amount})
              </Text>
              <Text style={{ color: "gray", fontSize: 12 }}>
                ⏰ {dayjs(order.order_time, "HH:mm:ss").format("hh:mm:ss A")}
              </Text>
              <Text style={{ color: "gray", fontSize: 12 }}>
                ⏰ {order.order_date}
              </Text>
              <Text style={{ color: statusColor, fontWeight: "bold" }}>
                {statusText}
              </Text>
            </View>
          );
        })
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 15 },
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

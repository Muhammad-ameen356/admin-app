import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
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
import { SafeAreaView } from "react-native-safe-area-context";

let db: SQLiteDatabase;

type User = { id: number; name: string; employeeId: number };
type Item = { id: number; name: string; amount: number };
type OrderItemInput = {
  itemId: number | null;
  quantity: number;
  dropdownOpen?: boolean;
};

export default function TakeOrderScreen() {
  const theme = useColorScheme() ?? "light";
  const styles = themedStyles(theme);

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
    <KeyboardAwareScrollView enableOnAndroid>
      <SafeAreaView style={styles.safeContainer}>
        <Text style={styles.title}>Take Order</Text>

        <Text style={styles.label}>Select User</Text>
        <DropDownPicker
          listMode="MODAL"
          modalTitle="Select a User"
          open={userDropdownOpen}
          value={selectedUserId}
          items={[
            { label: "-- Select User --", value: undefined },
            ...users.map((user) => ({
              label: user.name,
              value: user.id,
            })),
          ]}
          setOpen={setUserDropdownOpen}
          setValue={setSelectedUserId}
          placeholder="Select User"
          searchable
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownList}
        />

        <Text style={styles.label}>Items</Text>
        {orderItems.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            {/* Item Dropdown */}
            <View style={{ flex: 1 }}>
              <DropDownPicker
                listMode="MODAL"
                modalTitle="Select an Item"
                open={item.dropdownOpen || false}
                value={item.itemId}
                items={items.map((i) => ({
                  label: `${i.name} - Rs ${i.amount}`,
                  value: i.id,
                }))}
                setOpen={(val) => {
                  const updated = [...orderItems];
                  updated[index].dropdownOpen =
                    typeof val === "function"
                      ? val(item.dropdownOpen || false)
                      : val;
                  setOrderItems(updated);
                }}
                setValue={(callback) => {
                  const updated = [...orderItems];
                  updated[index].itemId = callback(item.itemId);
                  setOrderItems(updated);
                }}
                placeholder="Select Item"
                searchable
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList}
              />
            </View>

            {/* Quantity Controls */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() =>
                  handleItemChange(
                    index,
                    "quantity",
                    item.quantity > 1 ? item.quantity - 1 : 1
                  )
                }
                style={styles.qtyButton}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.qtyInput}
                placeholder="Qty"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={item.quantity.toString()}
                onChangeText={(val) => handleItemChange(index, "quantity", val)}
              />

              <TouchableOpacity
                onPress={() =>
                  handleItemChange(index, "quantity", item.quantity + 1)
                }
                style={styles.qtyButton}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Remove Button */}
            {orderItems.length > 1 && (
              <TouchableOpacity
                onPress={() => removeOrderItem(index)}
                style={{ marginLeft: 8 }}
              >
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
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={paidAmount}
          onChangeText={setPaidAmount}
        />

        <Button title="Save Order" onPress={handleSaveOrder} />

        <Text style={[styles.label, { marginTop: 30 }]}>Today Orders</Text>
        {orders.length === 0 ? (
          <Text style={styles.text}>No orders yet.</Text>
        ) : (
          orders.map((order) => {
            const diff = order.paid_amount - order.total_amount;
            let statusText =
              diff === 0
                ? "✅ Settled"
                : diff < 0
                ? `❌ Pending: Rs ${Math.abs(diff)}`
                : `💰 Extra Paid: Rs ${diff}`;

            let statusColor =
              diff === 0 ? "green" : diff < 0 ? "red" : "orange";

            return (
              <View key={order.id} style={styles.orderItem}>
                <Text style={styles.text}>
                  👤 {order.userName} - Rs {order.total_amount} (Paid: Rs
                  {order.paid_amount})
                </Text>
                <Text style={[styles.text, { fontSize: 12 }]}>
                  ⏰ {dayjs(order.order_time, "HH:mm:ss").format("hh:mm:ss A")}
                </Text>
                <Text style={[styles.text, { fontSize: 12 }]}>
                  📅 {order.order_date}
                </Text>
                <Text style={{ color: statusColor, fontWeight: "bold" }}>
                  {statusText}
                </Text>
              </View>
            );
          })
        )}
      </SafeAreaView>
    </KeyboardAwareScrollView>
  );
}

const themedStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: theme === "dark" ? "#121212" : "#fff",
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : "#000",
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: theme === "dark" ? "#eee" : "#111",
      marginTop: 15,
    },
    input: {
      borderWidth: 1,
      borderColor: theme === "dark" ? "#555" : "#ccc",
      backgroundColor: theme === "dark" ? "#222" : "#fff",
      color: theme === "dark" ? "#fff" : "#000",
      padding: 10,
      borderRadius: 6,
      marginBottom: 10,
    },
    dropdown: {
      backgroundColor: theme === "dark" ? "#222" : "#fff",
      borderColor: theme === "dark" ? "#555" : "#ccc",
    },
    dropdownList: {
      backgroundColor: theme === "dark" ? "#222" : "#fff",
    },
    // itemRow: {
    //   flexDirection: "row",
    //   alignItems: "center",
    //   marginBottom: 10,
    //   gap: 10,
    // },
    addButton: {
      backgroundColor: "#007bff",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 4,
      marginBottom: 10,
      alignSelf: "flex-start",
    },
    addButtonText: {
      color: "#fff",
      fontWeight: "600",
    },
    total: {
      fontSize: 18,
      fontWeight: "bold",
      marginVertical: 10,
      color: theme === "dark" ? "#fff" : "#000",
    },
    remove: { fontSize: 20, color: "red" },
    orderItem: {
      backgroundColor: theme === "dark" ? "#1e1e1e" : "#f1f1f1",
      padding: 10,
      borderRadius: 6,
      marginBottom: 8,
    },
    text: {
      color: theme === "dark" ? "#ddd" : "#333",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    quantityContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 8,
      borderWidth: 1,
      borderRadius: 6,
      borderColor: theme === "dark" ? "#555" : "#ccc",
      backgroundColor: theme === "dark" ? "#222" : "#fff",
    },

    qtyButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      justifyContent: "center",
      alignItems: "center",
    },

    qtyButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : "#000",
    },

    qtyInput: {
      width: 40,
      textAlign: "center",
      color: theme === "dark" ? "#fff" : "#000",
      paddingVertical: 4,
    },
  });

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { DATE_FORMAT_FOR_DB, dbName } from "@/constants/DBConstants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Vibration,
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
type Order = {
  id: number;
  userName: string;
  employeeId: number;
  order_date: string;
  order_time: string;
  total_amount: number;
  paid_amount: number;
};

export default function TakeOrderScreen() {
  const themeForStyle = useColorScheme() ?? "light";
  const styles = themedStyles(themeForStyle);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([
    { itemId: null, quantity: 1, dropdownOpen: false },
  ]);
  const [paidAmount, setPaidAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [dropdownItems, setDropdownItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        db = await openDatabaseAsync(dbName, { useNewConnection: true });
        await loadUsers();
        await loadItems();
        await loadOrders();
      })();
      return () => {
        resetForm();
      };
    }, [])
  );

  useEffect(() => {
    calculateTotal();
  }, [orderItems]);

  const loadUsers = async () => {
    const res = await db.getAllAsync<User>("SELECT * FROM users");

    setDropdownItems(res);
    setUsers(res);
  };

  const loadItems = async () => {
    const res = await db.getAllAsync<Item>("SELECT * FROM items");
    setItems(res);
  };

  const loadOrders = async () => {
    const date = dayjs().format(DATE_FORMAT_FOR_DB);
    const res = await db.getAllAsync<Order>(
      `SELECT orders.id, users.name as userName, users.employeeId as employeeId, orders.order_date, orders.order_time, orders.total_amount, orders.paid_amount
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
      if (editingOrderId) {
        // UPDATE MODE
        await db.runAsync(
          `UPDATE orders SET user_id = ?, total_amount = ?, paid_amount = ? WHERE id = ?`,
          [selectedUserId, totalAmount, paid, editingOrderId]
        );

        await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [
          editingOrderId,
        ]);

        for (const entry of orderItems) {
          await db.runAsync(
            `INSERT INTO order_items (order_id, item_id, quantity) VALUES (?, ?, ?)`,
            [editingOrderId, entry.itemId, entry.quantity]
          );
        }

        Alert.alert("Order updated successfully");
      } else {
        // CREATE MODE
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
      }

      resetForm();
      await loadOrders();
    } catch (err) {
      console.error("Save order error:", err);
      Alert.alert("Error saving order");
    }
  };

  const handleEditOrder = async (orderId: number) => {
    const order = await db.getFirstAsync<any>(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );

    const items = await db.getAllAsync<any>(
      `SELECT item_id, quantity FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    setSelectedUserId(order.user_id);
    setPaidAmount(order.paid_amount.toString());
    setTotalAmount(order.total_amount);
    setOrderItems(
      items.map((item) => ({
        itemId: item.item_id,
        quantity: item.quantity,
        dropdownOpen: false,
      }))
    );
    setEditingOrderId(orderId);
  };

  const deleteOrder = async (orderId: number) => {
    try {
      await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, [
        orderId,
      ]);
      await db.runAsync(`DELETE FROM orders WHERE id = ?`, [orderId]);

      Alert.alert("Order deleted successfully", "آرڈر ڈلیٹ ہو گیا ہے۔");
      await loadOrders();
    } catch (err) {
      console.error("Delete order error:", err);
      Alert.alert("Error deleting order");
    }
  };

  const handleDeleteOrder = (orderId: number) => {
    Alert.alert(
      "Delete Order",
      "آپ اس آرڈر کو ڈلیٹ کرنا چاہتے ہیں۔",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => deleteOrder(orderId),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setOrderItems([{ itemId: null, quantity: 1, dropdownOpen: false }]);
    setPaidAmount("");
    setTotalAmount(0);
    setEditingOrderId(null);
    setSelectedUser(null);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView style={styles.safeContainer}>
          <Text style={styles.title}>
            {editingOrderId ? "Update Order" : "Take Order"}
          </Text>

          <Text style={styles.label}>Select User</Text>
          <DropDownPicker
            listMode="MODAL"
            modalTitle="Select a User"
            open={userDropdownOpen}
            value={selectedUserId}
            items={[
              { label: "-- Select User --", value: undefined },
              ...users.map((user) => ({
                key: `userDropdown-${user.id}`,
                label: `${user.name} - ${user.employeeId}`,
                value: user.id,
              })),
            ]}
            setOpen={setUserDropdownOpen}
            setValue={setSelectedUserId}
            placeholder="Select User"
            searchable
            style={[
              styles.dropdown,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            dropDownContainerStyle={{
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            labelStyle={{ color: theme.text }}
            textStyle={{ color: theme.text }}
            placeholderStyle={{ color: theme.text }}
            searchTextInputStyle={{ color: theme.text }}
            modalContentContainerStyle={{
              backgroundColor: theme.background,
            }}
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
                    key: `itemDropdown-${i.id}`,
                    label: `${i.name} - Rs ${i.amount}`,
                    value: i.id,
                  }))}
                  setOpen={(val: any) => {
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
                  style={[
                    styles.dropdown,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  dropDownContainerStyle={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                  labelStyle={{ color: theme.text }}
                  textStyle={{ color: theme.text }}
                  placeholderStyle={{ color: theme.text }}
                  searchTextInputStyle={{ color: theme.text }}
                  modalContentContainerStyle={{
                    backgroundColor: theme.background,
                  }}
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
                  onChangeText={(val: any) =>
                    handleItemChange(index, "quantity", val)
                  }
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
            onChangeText={(text) => {
              // Allow only digits (remove -, letters, etc.)
              const digitsOnly = text.replace(/[^0-9]/g, "");
              setPaidAmount(digitsOnly);
            }}
          />

          <TouchableOpacity
            onPress={handleSaveOrder}
            style={{
              backgroundColor: editingOrderId ? "#f59e0b" : "#10b981",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 2,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              {editingOrderId ? "Update Order" : "Save Order"}
            </Text>
          </TouchableOpacity>
          {editingOrderId && (
            <TouchableOpacity onPress={resetForm} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>CANCEL UPDATE</Text>
            </TouchableOpacity>
          )}

          <ThemedView style={{ marginTop: 20 }}>
            <ThemedText>Filter Order By User</ThemedText>
            {/* Filter Order */}
            <DropDownPicker
              listMode="MODAL"
              modalTitle="Select a User"
              open={open}
              value={selectedUser}
              items={[
                { label: "-- Select User --", value: undefined },
                ...dropdownItems.map((user) => ({
                  key: `userDropdown-${user.id}`,
                  label: `${user.name} - ${user.employeeId}`,
                  value: user.employeeId,
                })),
              ]}
              setOpen={setOpen}
              setValue={setSelectedUser}
              setItems={setDropdownItems}
              placeholder="Filter by User"
              searchable
              style={[
                styles.dropdown,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              dropDownContainerStyle={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
              labelStyle={{ color: theme.text }}
              textStyle={{ color: theme.text }}
              placeholderStyle={{ color: theme.text }}
              searchTextInputStyle={{ color: theme.text }}
              modalContentContainerStyle={{
                backgroundColor: theme.background,
              }}
            />

            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              style={styles.resetButton}
            >
              <Text style={{ fontWeight: "bold" }}>🔄 Reset Filter</Text>
            </TouchableOpacity>
          </ThemedView>

          {/* Display Orders */}
          <Text style={[styles.label, { marginTop: 10 }]}>Today Orders</Text>
          {orders.length === 0 ? (
            <Text style={styles.text}>No orders yet.</Text>
          ) : (
            orders
              .filter((order) =>
                selectedUser ? order.employeeId === selectedUser : true
              )
              .map((order) => {
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
                  <TouchableOpacity
                    key={order.id}
                    onPress={() =>
                      Alert.alert("Hold to edit or delete this order")
                    }
                    onLongPress={() => {
                      Vibration.vibrate(100);
                      Alert.alert(
                        "Edit or Delete Order",
                        "آرڈر میں ترمیم کریں یا حذف کریں۔",
                        [
                          {
                            text: "Cancel",
                            style: "cancel",
                          },
                          {
                            text: "Delete",
                            onPress: () => handleDeleteOrder(order.id),
                            style: "destructive",
                          },
                          {
                            text: "Edit",
                            onPress: () => handleEditOrder(order.id),
                          },
                        ],
                        { cancelable: true }
                      );
                    }}
                    style={styles.orderItem}
                  >
                    <Text
                      style={[
                        styles.text,
                        { fontWeight: "700", fontSize: 16, marginBottom: 8 },
                      ]}
                    >
                      {order.userName}
                    </Text>
                    <Text
                      style={[
                        styles.text,
                        { fontSize: 14, opacity: 0.7, marginBottom: 8 },
                      ]}
                    >
                      Employee ID: {order.employeeId}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={[styles.text, { fontSize: 14 }]}>Total</Text>
                      <Text style={[styles.text, { fontWeight: "600" }]}>
                        Rs {order.total_amount}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={[styles.text, { fontSize: 14 }]}>Paid</Text>
                      <Text style={[styles.text, { fontWeight: "600" }]}>
                        Rs {order.paid_amount}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={[styles.text, { fontSize: 13, opacity: 0.7 }]}
                      >
                        {dayjs(order.order_time, "HH:mm:ss").format(
                          "hh:mm:ss A"
                        )}
                      </Text>
                      <Text
                        style={[styles.text, { fontSize: 13, opacity: 0.7 }]}
                      >
                        {order.order_date}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: statusColor,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}
                      >
                        {statusText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const themedStyles = (theme: "light" | "dark") =>
  StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: theme === "dark" ? "#111827" : "#f9fafb",
      padding: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
      fontSize: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    dropdown: {
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    dropdownList: {
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
    },
    addButton: {
      backgroundColor: "#2563eb",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 12,
      alignSelf: "flex-start",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    addButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 15,
    },
    total: {
      fontSize: 20,
      fontWeight: "700",
      marginVertical: 12,
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
    },
    remove: { fontSize: 22, color: "#ef4444" },
    orderItem: {
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    text: {
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      marginBottom: 4,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    quantityContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 8,
      borderWidth: 1,
      borderRadius: 10,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      overflow: "hidden",
    },
    qtyButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#374151" : "#f3f4f6",
    },
    qtyButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
    },
    qtyInput: {
      width: 45,
      textAlign: "center",
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      paddingVertical: 8,
      fontSize: 15,
      fontWeight: "600",
    },
    cancelButton: {
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme === "dark" ? "#374151" : "#e5e7eb",
      borderRadius: 12,
    },
    cancelButtonText: {
      color: theme === "dark" ? "#f3f4f6" : "#1f2937",
      fontWeight: "600",
      textAlign: "center",
      fontSize: 15,
    },
    resetButton: {
      alignSelf: "flex-end",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
      borderWidth: 1,
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
    },
  });

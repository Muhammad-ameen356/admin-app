// app/(tabs)/items.tsx

import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

type Item = {
  id: number;
  name: string;
};

export default function ItemScreen() {
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const initDb = async () => {
      const db = await SQLite.openDatabaseAsync('mydb.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );
      `);
      fetchItems();
    };
    initDb();
  }, []);

  const addItem = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Please enter an item name');
      return;
    }

    const db = await SQLite.openDatabaseAsync('mydb.db');
    await db.runAsync('INSERT INTO items (name) VALUES (?)', inputValue.trim());

    setInputValue('');
    fetchItems();
  };

  const fetchItems = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    const result = await db.getAllAsync('SELECT * FROM items');
    setItems(result as Item[]);
  };

  const debugPrintItems = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    const result = await db.getAllAsync('SELECT * FROM items');
    console.log("Items in DB:", result);
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Item Summary</Text>

      <TextInput
        placeholder="Enter item name"
        value={inputValue}
        onChangeText={setInputValue}
        style={styles.input}
      />

      <Button title="➕ Add Item" onPress={addItem} />
      <Button title="📤 Export DB" onPress={debugPrintItems} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemBox}>
            <Text style={styles.itemText}>📝 {item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 50,
    },
    title: {
      fontSize: 22,
      marginBottom: 20,
      fontWeight: 'bold',
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 12,
      marginBottom: 10,
      borderRadius: 6,
    },
    list: {
      marginTop: 20,
    },
    itemBox: {
      backgroundColor: '#f0f0f0',
      padding: 12,
      marginBottom: 8,
      borderRadius: 6,
    },
    itemText: {
      fontSize: 16,
    },
  });
  
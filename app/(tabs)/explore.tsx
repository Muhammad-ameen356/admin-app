import { Image } from 'expo-image';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TextInput } from 'react-native-gesture-handler';


type TestRow = {
  id: number;
  value: string;
  intValue: number;
};

export default function TabTwoScreen() {
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<TestRow[]>([]);

  useEffect(() => {
    const setupDatabase = async () => {
      const db = await SQLite.openDatabaseAsync('mydb.db');
  
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS test (
          id INTEGER PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          intValue INTEGER
        );
      `);
  
      await fetchItems();
    };
  
    setupDatabase();
  }, []);
  

  const addItem = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Please enter a value');
      return;
    }
  
    const db = await SQLite.openDatabaseAsync('mydb.db');
    await db.runAsync(
      'INSERT INTO test (value, intValue) VALUES (?, ?)',
      inputValue.trim(),
      Math.floor(Math.random() * 1000)
    );
  
    setInputValue('');
    await fetchItems(); // 👈 Refresh item list after insert
  };
  

  const fetchItems = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    const rows = (await db.getAllAsync('SELECT * FROM test')) as TestRow[];
    setItems(rows); // Update state
  };
  

  const updateItem = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    await db.runAsync('UPDATE test SET intValue = ? WHERE value = ?', [999, 'aaa']);
  };

  const deleteItem = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    await db.runAsync('DELETE FROM test WHERE value = $value', { $value: 'aaa' });
  };

  const getSingleItem = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    const row = (await db.getFirstAsync('SELECT * FROM test')) as TestRow;
    console.log('First row:', row.id, row.value, row.intValue);
  };

  const getAllItems = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    const rows = (await db.getAllAsync('SELECT * FROM test')) as TestRow[];
    console.log('All Rows:');
    rows.forEach((row) => {
      console.log(row.id, row.value, row.intValue);
    });
  };

  const streamItems = async () => {
    const db = await SQLite.openDatabaseAsync('mydb.db');
    for await (const _row of db.getEachAsync('SELECT * FROM test')) {
      const row = _row as TestRow;
      console.log('Streamed Row:', row.id, row.value, row.intValue);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>
      <ThemedText>This app includes example code to help you get started.</ThemedText>

      <View style={{ marginVertical: 20 }}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter item name"
          value={inputValue}
          onChangeText={setInputValue}
          style={styles.input}
        />
        <Button title="➕ Add Item" onPress={addItem} />
      </View>
        <Button title="✏️ Update Item" onPress={updateItem} />
        <Button title="🗑️ Delete Item" onPress={deleteItem} />
        <Button title="🔍 Get First Row" onPress={getSingleItem} />
        <Button title="📄 Show All Items" onPress={getAllItems} />
        <Button title="🔁 Stream Items" onPress={streamItems} />
        {items.map((item) => (
          <ThemedText key={item.id}>
            {item.id}. {item.value} — {item.intValue}
          </ThemedText>
        ))}
      </View>

      <Collapsible title="File-based routing">
        <ThemedText>
          This app has two screens:{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Images">
        <ThemedText>Below is a static image example:</ThemedText>
        <Image source={require('@/assets/images/react-logo.png')} style={{ alignSelf: 'center' }} />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Custom fonts">
        <ThemedText>
          Custom font loaded in <ThemedText type="defaultSemiBold">app/_layout.tsx</ThemedText>.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Animations">
        <ThemedText>
          This template includes animation examples using{' '}
          <ThemedText type="defaultSemiBold">react-native-reanimated</ThemedText>.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              Parallax effects via{' '}
              <ThemedText type="defaultSemiBold">ParallaxScrollView</ThemedText>.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  inputContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    fontSize: 16,
  },
});
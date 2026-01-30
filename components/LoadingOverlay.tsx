// components/LoadingOverlay.tsx
import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

export function LoadingOverlay({ visible }: { visible: boolean }) {
  const scheme = useColorScheme(); // 'dark' | 'light'

  const isDark = scheme === "dark";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark
              ? "rgba(0,0,0,0.6)"
              : "rgba(255,255,255,0.6)",
          },
        ]}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

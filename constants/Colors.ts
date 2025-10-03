/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#2563eb";
const tintColorDark = "#60a5fa";

export const Colors = {
  light: {
    text: "#1f2937",
    background: "#f9fafb",
    tint: tintColorLight,
    icon: "#6b7280",
    tabIconDefault: "#9ca3af",
    tabIconSelected: tintColorLight,
    card: "#ffffff",
    border: "#e5e7eb",
    cardBorder: "#e5e7eb",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    secondary: "#64748b",
    accent: "#0ea5e9",
  },
  dark: {
    text: "#f3f4f6",
    background: "#111827",
    tint: tintColorDark,
    icon: "#9ca3af",
    tabIconDefault: "#6b7280",
    tabIconSelected: tintColorDark,
    card: "#1f2937",
    border: "#374151",
    cardBorder: "#374151",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    secondary: "#94a3b8",
    accent: "#38bdf8",
  },
};

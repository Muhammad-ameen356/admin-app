import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications behave when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});

export const setupBackupNotifications = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("backup", {
      name: "Backup Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default", // 🔥 system default sound
      vibrationPattern: [0, 300, 300, 300],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
};

// Call this function once (e.g., on first app load)
export const scheduleWeeklyBackupReminder = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Permission for notifications not granted");
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📦 Weekly Backup Reminder",
      body: "Don't forget to export your order data via WhatsApp!",
      sound: true,
    },
    trigger: {
      weekday: 2, // Monday
      hour: 10,
      minute: 30,
      repeats: true,
      type: "calendar",
    } as Notifications.CalendarTriggerInput,
  });
};

export const notifyBackupStarted = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "☁️ Backup Started",
      body: "Your database backup to Google Drive has started.",
      sound: "default", // iOS
    },
    trigger: null, // immediate
  });
};

export const notifyBackupSuccess = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "✅ Backup Successful",
      body: "Your database was safely backed up to Google Drive.",
      sound: true,
    },
    trigger: null,
  });
};

export const notifyBackupFailed = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "❌ Backup Failed",
      body: "Backup failed. Please try again.",
      sound: true,
    },
    trigger: null,
  });
};

export const scheduleDailyBackupReminder = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📦 Daily Backup Reminder",
      body: "Please back up your database to Google Drive.",
      sound: true,
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
      type: "calendar",
    } as Notifications.CalendarTriggerInput,
  });
};

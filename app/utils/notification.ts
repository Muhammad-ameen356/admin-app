import * as Notifications from "expo-notifications";

// Configure how notifications behave when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});

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

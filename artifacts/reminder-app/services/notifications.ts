import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { combineDateAndTime } from "@/utils/dates";

let configured = false;
const KNOWN_TONES = ["bell", "chime", "beep", "gentle", "marimba"] as const;
export const ALARM_NOTIFICATION_CATEGORY = "alarm-actions";
export const ALARM_ACTION_STOP = "alarm-stop";
export const ALARM_ACTION_SNOOZE = "alarm-snooze";

function channelIdForTone(toneId?: string) {
  if (!toneId || !KNOWN_TONES.includes(toneId as (typeof KNOWN_TONES)[number])) return "alarms";
  return `alarms-${toneId}`;
}

async function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  try {
    await Notifications.setNotificationCategoryAsync(ALARM_NOTIFICATION_CATEGORY, [
      {
        identifier: ALARM_ACTION_STOP,
        buttonTitle: "Stop",
        options: { isDestructive: true },
      },
      {
        identifier: ALARM_ACTION_SNOOZE,
        buttonTitle: "Snooze",
      },
    ]);
  } catch {
    /* noop */
  }
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("alarms", {
        name: "Alarms",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1a73e8",
        sound: "default",
      });
      for (const toneId of KNOWN_TONES) {
        await Notifications.setNotificationChannelAsync(channelIdForTone(toneId), {
          name: `Alarm (${toneId})`,
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1a73e8",
          sound: `${toneId}.wav`,
        });
      }
    } catch {
      /* noop */
    }
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await configure();
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (settings.canAskAgain === false) return false;
    const result = await Notifications.requestPermissionsAsync();
    return !!result.granted;
  } catch {
    return false;
  }
}

export async function scheduleTaskAlarm(args: {
  taskId: string;
  title: string;
  notes?: string;
  date: string;
  time: string;
  alarmTone?: string;
}): Promise<string | undefined> {
  if (Platform.OS === "web") return undefined;
  const granted = await ensureNotificationPermission();
  if (!granted) return undefined;

  const triggerDate = combineDateAndTime(args.date, args.time);
  if (triggerDate.getTime() <= Date.now() + 1000) {
    return undefined;
  }
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: args.title || "Reminder",
        body: args.notes?.trim() ? args.notes.trim() : "Tap to view your task",
        sound: args.alarmTone ? `${args.alarmTone}.wav` : "default",
        data: {
          taskId: args.taskId,
          alarmTone: args.alarmTone,
        },
        categoryIdentifier: ALARM_NOTIFICATION_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === "android" ? channelIdForTone(args.alarmTone) : undefined,
      },
    });
    return id;
  } catch {
    return undefined;
  }
}

export interface SnoozeResult {
  id?: string;
  triggerAt: number;
}

export async function scheduleSnooze(args: {
  taskId: string;
  title: string;
  notes?: string;
  minutes: number;
  alarmTone?: string;
}): Promise<SnoozeResult> {
  const triggerAt = Date.now() + args.minutes * 60 * 1000;
  if (Platform.OS === "web") return { triggerAt };
  const granted = await ensureNotificationPermission();
  if (!granted) return { triggerAt };
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: args.title || "Reminder",
        body: args.notes?.trim() ? args.notes.trim() : `Snoozed for ${args.minutes} minutes`,
        sound: args.alarmTone ? `${args.alarmTone}.wav` : "default",
        data: {
          taskId: args.taskId,
          alarmTone: args.alarmTone,
        },
        categoryIdentifier: ALARM_NOTIFICATION_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerAt),
        channelId: Platform.OS === "android" ? channelIdForTone(args.alarmTone) : undefined,
      },
    });
    return { id, triggerAt };
  } catch {
    return { triggerAt };
  }
}

export async function cancelNotification(id?: string) {
  if (!id || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* noop */
  }
}

export async function scheduleRepeatingAlarmNudge(args: {
  taskId: string;
  title: string;
  notes?: string;
  alarmTone?: string;
}): Promise<string | undefined> {
  if (Platform.OS === "web") return undefined;
  const granted = await ensureNotificationPermission();
  if (!granted) return undefined;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: args.title || "Reminder",
        body: args.notes?.trim() ? args.notes.trim() : "Alarm ringing. Tap Stop or Snooze.",
        sound: args.alarmTone ? `${args.alarmTone}.wav` : "default",
        data: {
          taskId: args.taskId,
          alarmTone: args.alarmTone,
          repeating: true,
        },
        categoryIdentifier: ALARM_NOTIFICATION_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        repeats: true,
        channelId: Platform.OS === "android" ? channelIdForTone(args.alarmTone) : undefined,
      },
    });
    return id;
  } catch {
    return undefined;
  }
}

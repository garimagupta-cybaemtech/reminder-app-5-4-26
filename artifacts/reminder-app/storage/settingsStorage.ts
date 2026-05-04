import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_SETTINGS, type Settings } from "@/types";

function keyFor(userId: string) {
  return `reminder.settings.v1.${userId}`;
}

export async function loadSettings(userId: string): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(userId: string, settings: Settings): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(settings));
}

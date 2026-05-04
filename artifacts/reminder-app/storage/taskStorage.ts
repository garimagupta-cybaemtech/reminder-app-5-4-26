import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Task } from "@/types";

export function keyFor(userId: string) {
  return `reminder.tasks.v2.${userId}`;
}

export async function loadTasks(userId: string): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { tasks: Task[] };
    return parsed.tasks ?? [];
  } catch {
    return [];
  }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify({ tasks }));
}

export async function hasSeededFor(userId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(`reminder.seeded.${userId}`);
  return v === "1";
}

export async function markSeeded(userId: string): Promise<void> {
  await AsyncStorage.setItem(`reminder.seeded.${userId}`, "1");
}

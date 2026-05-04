import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/types";

const SESSION_KEY = "reminder.session.v1";
const USERS_KEY = "reminder.users.v1";

export async function loadSessionUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveSessionUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, userId);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function loadUsers(): Promise<User[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { users?: User[] };
    return parsed.users ?? [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify({ users }));
}

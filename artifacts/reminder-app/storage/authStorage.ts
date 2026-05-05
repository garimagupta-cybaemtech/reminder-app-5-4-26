import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/types";

const SESSION_KEY = "reminder.session.v1";
const USERS_KEY = "reminder.users.v1";

interface StoredUser {
  userId: string;
  name: string;
  email: string;
  orgId: string | null;
  username?: string;
  password?: string;
  color?: string;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeStoredUsers(input: unknown): StoredUser[] {
  const rows = Array.isArray(input)
    ? input
    : (input as { users?: unknown[] } | null | undefined)?.users ?? [];

  const dedupById = new Map<string, StoredUser>();
  const seenEmail = new Set<string>();

  for (const row of rows) {
    const obj = (row ?? {}) as Record<string, unknown>;
    const userId = normalizeText(obj.userId ?? obj.id);
    const name = normalizeText(obj.name);
    const username = normalizeText(obj.username);
    const email = normalizeEmail(obj.email ?? (username ? `${username}@reminder.local` : ""));
    if (!userId || !email || !name) continue;
    if (seenEmail.has(email) || dedupById.has(userId)) continue;
    const orgIdRaw = normalizeText(obj.orgId);
    dedupById.set(userId, {
      userId,
      name,
      email,
      orgId: orgIdRaw || null,
      username: username || email.split("@")[0],
      password: normalizeText(obj.password),
      color: normalizeText(obj.color),
    });
    seenEmail.add(email);
  }

  return Array.from(dedupById.values());
}

function storedToUser(stored: StoredUser): User {
  const username = normalizeText(stored.username) || stored.email.split("@")[0] || stored.userId;
  return {
    id: stored.userId,
    userId: stored.userId,
    name: stored.name,
    email: stored.email,
    orgId: stored.orgId ?? null,
    username,
    password: normalizeText(stored.password),
    color: normalizeText(stored.color) || "#1a73e8",
  };
}

function userToStored(user: User): StoredUser | null {
  const userId = normalizeText(user.userId || user.id);
  const name = normalizeText(user.name);
  const username = normalizeText(user.username);
  const email = normalizeEmail(user.email || (username ? `${username}@reminder.local` : ""));
  if (!userId || !name || !email) return null;
  return {
    userId,
    name,
    email,
    orgId: user.orgId ?? null,
    username: username || email.split("@")[0],
    password: normalizeText(user.password),
    color: normalizeText(user.color),
  };
}

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
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeStoredUsers(parsed);
    return normalized.map(storedToUser);
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  const normalized = normalizeStoredUsers(users.map((u) => userToStored(u)).filter((u): u is StoredUser => !!u));
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(normalized));
}

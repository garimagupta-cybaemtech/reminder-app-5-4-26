import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Organization } from "@/types";

const KEY = "reminder.organizations.v1";

export async function loadOrganizations(): Promise<Organization[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { organizations?: Organization[] };
    return parsed.organizations ?? [];
  } catch {
    return [];
  }
}

export async function saveOrganizations(organizations: Organization[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ organizations }));
}

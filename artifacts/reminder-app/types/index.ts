export type Category = "Travel" | "Meeting" | "Block Time" | "Other";

export const CATEGORIES: Category[] = ["Travel", "Meeting", "Block Time", "Other"];

export type ReminderPreset = "Today" | "Tomorrow" | "Day after tomorrow" | "Custom";

export type Recurring = "None" | "Daily" | "Weekly";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string;
  time: string;
  category: Category;
  voiceNote?: string;
  location?: string;
  reminder: ReminderPreset;
  alarm: boolean;
  alarmTone?: string;
  snoozeMinutes?: number;
  completed: boolean;
  cancelled: boolean;
  notificationId?: string;
  snoozedUntil?: number;
  ringing?: boolean;
  repeatingNotificationId?: string;
  recurring: Recurring;
  createdBy?: string;
  participants?: string[];
  ownerUserId?: string;
  participantUserIds?: string[];
  sharedGroupId?: string;
  createdAt: number;
}

export type FilterTab = "All" | Category;

export const FILTER_TABS: FilterTab[] = ["All", "Travel", "Meeting", "Block Time"];

export interface User {
  id: string;
  userId: string;
  email: string;
  orgId: string | null;
  username: string;
  password: string;
  name: string;
  color: string;
}

export interface Settings {
  alarmTone: string;
}

export interface Organization {
  id: string;
  name: string;
  members: OrganizationMember[];
  createdAt: number;
}

export type OrganizationRole = "Admin" | "Member";

export interface OrganizationMember {
  userId: string;
  role: OrganizationRole;
}

export const DEFAULT_SETTINGS: Settings = {
  alarmTone: "bell",
};

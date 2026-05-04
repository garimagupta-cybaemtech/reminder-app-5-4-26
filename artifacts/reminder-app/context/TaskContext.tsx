import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import {
  ALARM_ACTION_SNOOZE,
  ALARM_ACTION_STOP,
  cancelNotification,
  scheduleRepeatingAlarmNudge,
  scheduleSnooze,
  scheduleTaskAlarm,
} from "@/services/notifications";
import { startLoopingTone, stopTone } from "@/services/sounds";
import { hasSeededFor, keyFor, loadTasks, markSeeded, saveTasks } from "@/storage/taskStorage";
import type { Category, FilterTab, Recurring, ReminderPreset, Task } from "@/types";
import { addDaysYMD, genId, parseYMD, todayYMD } from "@/utils/dates";

interface NewTaskInput {
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
  recurring: Recurring;
  memberUserIds?: string[];
}

interface TaskContextValue {
  tasks: Task[];
  loaded: boolean;
  addTask: (input: NewTaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  setSnoozedUntil: (id: string, ts: number, notificationId?: string) => Promise<void>;
  stopAlarm: (id: string) => Promise<void>;
  snoozeAlarm: (id: string, minutes?: number) => Promise<void>;
  activeRingingTask: Task | null;
  tasksForDate: (date: string, filter?: FilterTab, search?: string) => Task[];
  tasksMarkedDates: () => Record<string, { dots: { color: string; key: string }[] }>;
  searchTasks: (query: string, filter?: FilterTab) => Task[];
  upcomingTasks: () => Task[];
}

const TaskContext = createContext<TaskContextValue | null>(null);

const CATEGORY_COLORS: Record<Category, string> = {
  Travel: "#e8710a",
  Meeting: "#1a73e8",
  "Block Time": "#7627bb",
  Other: "#16a765",
};

function expandRecurring(task: Task, date: string): Task | null {
  if (task.date === date) return task;
  if (task.recurring === "None") return null;
  const start = parseYMD(task.date).getTime();
  const target = parseYMD(date).getTime();
  if (target < start) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((target - start) / dayMs);
  if (task.recurring === "Daily") {
    return { ...task, date };
  }
  if (task.recurring === "Weekly" && diffDays % 7 === 0) {
    return { ...task, date };
  }
  return null;
}

function matchesFilter(task: Task, filter: FilterTab) {
  if (filter === "All") return true;
  return task.category === filter;
}

function matchesSearch(task: Task, search: string) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    (task.location ?? "").toLowerCase().includes(q) ||
    task.category.toLowerCase().includes(q)
  );
}

function seedFor(userId: string): Task[] {
  const today = todayYMD();
  const tomorrow = addDaysYMD(today, 1);
  const dayAfter = addDaysYMD(today, 2);
  const base = (overrides: Partial<Task>): Task => ({
    id: genId(),
    title: "",
    date: today,
    time: "09:00",
    category: "Meeting",
    reminder: "Today",
    alarm: true,
    completed: false,
    cancelled: false,
    recurring: "None",
    participantUserIds: [userId],
    ownerUserId: userId,
    createdAt: Date.now(),
    ...overrides,
  });
  switch (userId) {
    case "u-alice":
      return [
        base({
          title: "Team standup",
          time: "10:00",
          category: "Meeting",
          location: "Zoom",
        }),
        base({
          title: "Flight to Mumbai",
          date: tomorrow,
          time: "16:30",
          category: "Travel",
          location: "Terminal 2",
        }),
        base({
          title: "Deep work block",
          date: today,
          time: "14:00",
          category: "Block Time",
          recurring: "Daily",
        }),
      ];
    case "u-bob":
      return [
        base({
          title: "Client call - Acme Corp",
          time: "11:00",
          category: "Meeting",
        }),
        base({
          title: "Gym workout",
          date: today,
          time: "18:00",
          category: "Other",
          recurring: "Weekly",
        }),
        base({
          title: "Review Q2 strategy",
          date: dayAfter,
          time: "09:30",
          category: "Block Time",
        }),
      ];
    case "u-carol":
      return [
        base({
          title: "Doctor appointment",
          time: "15:00",
          category: "Other",
          location: "Sunrise Clinic",
        }),
        base({
          title: "Pick up groceries",
          date: today,
          time: "19:00",
          category: "Other",
        }),
        base({
          title: "Weekend getaway packing",
          date: tomorrow,
          time: "20:00",
          category: "Travel",
        }),
      ];
    case "u-david":
      return [
        base({
          title: "Code review with team",
          time: "13:00",
          category: "Meeting",
        }),
        base({
          title: "Yoga session",
          date: today,
          time: "07:00",
          category: "Other",
          recurring: "Daily",
        }),
      ];
    default:
      return [];
  }
}

async function loadRawTasksForUser(userId: string): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  const parsed = raw ? (JSON.parse(raw) as { tasks?: Task[] }) : { tasks: [] };
  return parsed.tasks ?? [];
}

async function saveRawTasksForUser(userId: string, tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify({ tasks }));
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setTasks([]);
      setLoaded(false);
      return () => {
        mounted = false;
      };
    }
    setLoaded(false);
    (async () => {
      const hydrateWithAlarms = async (input: Task[]) => {
        let changed = false;
        const next: Task[] = [];
        for (const task of input) {
          if (
            task.alarm &&
            !task.cancelled &&
            !task.completed &&
            !task.notificationId &&
            new Date(`${task.date}T${task.time}:00`).getTime() > Date.now() + 1000
          ) {
            const notificationId = await scheduleTaskAlarm({
              taskId: task.id,
              title: task.title,
              notes: task.notes,
              date: task.date,
              time: task.time,
              alarmTone: task.alarmTone,
            });
            next.push({ ...task, notificationId });
            changed = true;
            continue;
          }
          next.push(task);
        }
        if (changed && user) await saveTasks(user.id, next);
        return next;
      };

      const seeded = await hasSeededFor(user.id);
      if (!seeded) {
        const initial = seedFor(user.id);
        const hydrated = await hydrateWithAlarms(initial);
        await saveTasks(user.id, hydrated);
        await markSeeded(user.id);
        if (mounted) {
          setTasks(hydrated);
          setLoaded(true);
        }
        return;
      }
      const t = await loadTasks(user.id);
      const hydrated = await hydrateWithAlarms(t);
      if (mounted) {
        setTasks(hydrated);
        setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (loaded && user) {
      saveTasks(user.id, tasks).catch(() => undefined);
    }
  }, [tasks, loaded, user?.id]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const triggerRingingForTask = async (taskId?: string, toneId?: string) => {
      if (!taskId) return;
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      const tone = toneId ?? task.alarmTone;
      if (tone) await startLoopingTone(tone);
      if (task.ringing) return;
      const repeatId = await scheduleRepeatingAlarmNudge({
        taskId: task.id,
        title: task.title,
        notes: task.notes,
        alarmTone: tone,
      });
      if (!repeatId) return;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ringing: true, repeatingNotificationId: repeatId } : t)),
      );
    };

    const stopFromAction = async (taskId?: string) => {
      if (!taskId) return;
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      stopTone();
      if (task.repeatingNotificationId) {
        await cancelNotification(task.repeatingNotificationId);
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ringing: false, repeatingNotificationId: undefined } : t)),
      );
    };

    const snoozeFromAction = async (taskId?: string) => {
      if (!taskId) return;
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      stopTone();
      if (task.notificationId) await cancelNotification(task.notificationId);
      if (task.repeatingNotificationId) await cancelNotification(task.repeatingNotificationId);
      const minutesToUse = task.snoozeMinutes ?? 10;
      const result = await scheduleSnooze({
        taskId: task.id,
        title: task.title,
        notes: task.notes,
        minutes: minutesToUse,
        alarmTone: task.alarmTone,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                snoozedUntil: result.triggerAt,
                notificationId: result.id,
                ringing: false,
                repeatingNotificationId: undefined,
              }
            : t,
        ),
      );
    };

    const onReceive = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data as { taskId?: string; alarmTone?: string } | undefined;
      triggerRingingForTask(data?.taskId, data?.alarmTone).catch(() => undefined);
    });

    const onResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { taskId?: string; alarmTone?: string }
        | undefined;
      if (response.actionIdentifier === ALARM_ACTION_STOP) {
        stopFromAction(data?.taskId).catch(() => undefined);
        return;
      }
      if (response.actionIdentifier === ALARM_ACTION_SNOOZE) {
        snoozeFromAction(data?.taskId).catch(() => undefined);
        return;
      }
      triggerRingingForTask(data?.taskId, data?.alarmTone).catch(() => undefined);
    });

    return () => {
      onReceive.remove();
      onResponse.remove();
      stopTone();
    };
  }, []);

  const syncSharedAcrossUsers = useCallback(
    async (
      sharedGroupId: string | undefined,
      participantUserIds: string[] | undefined,
      apply: (task: Task) => Task | null,
    ) => {
      if (!sharedGroupId || !participantUserIds?.length) return;
      for (const memberId of participantUserIds) {
        if (memberId === user?.id) continue;
        const memberTasks = await loadRawTasksForUser(memberId);
        const next = memberTasks
          .map((t) => {
            if (t.sharedGroupId !== sharedGroupId) return t;
            const updated = apply(t);
            if (!updated) return null;
            return {
              ...updated,
              notificationId: undefined,
              repeatingNotificationId: undefined,
              ringing: false,
            };
          })
          .filter((x): x is Task => !!x);
        const dedup = new Map<string, Task>();
        for (const t of next) {
          const key = t.sharedGroupId ? `shared:${t.sharedGroupId}` : `task:${t.id}`;
          if (!dedup.has(key)) dedup.set(key, t);
        }
        await saveRawTasksForUser(memberId, Array.from(dedup.values()));
      }
    },
    [user?.id],
  );

  const addTask = useCallback(async (input: NewTaskInput) => {
    if (!user) return;
    const participantUserIds = Array.from(new Set([user.id, ...(input.memberUserIds ?? [])]));
    const sharedGroupId = participantUserIds.length > 1 ? genId() : undefined;
    let notificationId: string | undefined;
    const taskId = genId();
    if (input.alarm) {
      notificationId = await scheduleTaskAlarm({
        taskId,
        title: input.title,
        notes: input.notes,
        date: input.date,
        time: input.time,
        alarmTone: input.alarmTone,
      });
    }
    const newTask: Task = {
      id: taskId,
      title: input.title,
      notes: input.notes,
      date: input.date,
      time: input.time,
      category: input.category,
      voiceNote: input.voiceNote,
      location: input.location,
      reminder: input.reminder,
      alarm: input.alarm,
      alarmTone: input.alarmTone,
      snoozeMinutes: input.snoozeMinutes,
      ringing: false,
      recurring: input.recurring,
      ownerUserId: user.id,
      participantUserIds,
      sharedGroupId,
      completed: false,
      cancelled: false,
      notificationId,
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    const otherMemberIds = participantUserIds.filter((id) => id !== user.id);
    if (otherMemberIds.length === 0) return;

    for (const memberId of otherMemberIds) {
      const memberTasks = await loadRawTasksForUser(memberId);
      const memberTask: Task = {
        ...newTask,
        id: genId(),
        notificationId: undefined,
        repeatingNotificationId: undefined,
        ringing: false,
      };
      const deduped = memberTasks.filter((t) => t.sharedGroupId !== sharedGroupId);
      deduped.unshift(memberTask);
      await saveRawTasksForUser(memberId, deduped);
    }
  }, [user]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    if (existing.notificationId) {
      await cancelNotification(existing.notificationId);
    }
    if (existing.repeatingNotificationId) {
      await cancelNotification(existing.repeatingNotificationId);
    }
    const resolvedParticipants = Array.from(
      new Set(patch.participantUserIds ?? existing.participantUserIds ?? [existing.ownerUserId ?? user?.id ?? ""]),
    ).filter(Boolean);
    const resolvedSharedGroupId =
      existing.sharedGroupId ?? (resolvedParticipants.length > 1 ? genId() : undefined);

    const merged: Task = {
      ...existing,
      ...patch,
      participantUserIds: resolvedParticipants,
      sharedGroupId: resolvedSharedGroupId,
      notificationId: undefined,
      snoozedUntil: undefined,
      ringing: false,
      repeatingNotificationId: undefined,
    };
    let nextNotificationId: string | undefined;
    if (merged.alarm && !merged.cancelled && !merged.completed) {
      nextNotificationId = await scheduleTaskAlarm({
        taskId: merged.id,
        title: merged.title,
        notes: merged.notes,
        date: merged.date,
        time: merged.time,
        alarmTone: merged.alarmTone,
      });
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...merged, notificationId: nextNotificationId } : t)),
    );
    const previousParticipants = Array.from(new Set(existing.participantUserIds ?? [existing.ownerUserId ?? user?.id ?? ""])).filter(Boolean);
    const nextParticipants = resolvedParticipants;

    await syncSharedAcrossUsers(resolvedSharedGroupId, previousParticipants, (memberTask) => ({
      ...memberTask,
      ...patch,
      participantUserIds: nextParticipants,
      snoozedUntil: undefined,
      ringing: false,
      repeatingNotificationId: undefined,
    }));
    const addedMembers = nextParticipants.filter((memberId) => !previousParticipants.includes(memberId) && memberId !== user?.id);
    for (const memberId of addedMembers) {
      const memberTasks = await loadRawTasksForUser(memberId);
      const memberTask: Task = {
        ...merged,
        participantUserIds: nextParticipants,
        id: genId(),
        notificationId: undefined,
        repeatingNotificationId: undefined,
        ringing: false,
      };
      const deduped = memberTasks.filter((t) => t.sharedGroupId !== resolvedSharedGroupId);
      deduped.unshift(memberTask);
      await saveRawTasksForUser(memberId, deduped);
    }
    const removedMembers = previousParticipants.filter((memberId) => !nextParticipants.includes(memberId) && memberId !== user?.id);
    for (const memberId of removedMembers) {
      const memberTasks = await loadRawTasksForUser(memberId);
      await saveRawTasksForUser(
        memberId,
        memberTasks.filter((t) => t.sharedGroupId !== resolvedSharedGroupId),
      );
    }
  }, [tasks, syncSharedAcrossUsers, user?.id]);

  const deleteTask = useCallback(async (id: string) => {
    const existing = tasks.find((x) => x.id === id);
    setTasks((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t?.notificationId) cancelNotification(t.notificationId);
      if (t?.repeatingNotificationId) cancelNotification(t.repeatingNotificationId);
      return prev.filter((x) => x.id !== id);
    });
    if (existing) {
      await syncSharedAcrossUsers(existing.sharedGroupId, existing.participantUserIds, () => null);
    }
  }, [tasks, syncSharedAcrossUsers]);

  const toggleComplete = useCallback(async (id: string) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    const completed = !existing.completed;
    if (existing.notificationId) await cancelNotification(existing.notificationId);
    let notificationId: string | undefined;
    if (!completed && existing.alarm && !existing.cancelled) {
      notificationId = await scheduleTaskAlarm({
        taskId: existing.id,
        title: existing.title,
        notes: existing.notes,
        date: existing.date,
        time: existing.time,
        alarmTone: existing.alarmTone,
      });
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed,
              cancelled: false,
              notificationId,
              snoozedUntil: undefined,
              ringing: false,
              repeatingNotificationId: undefined,
            }
          : t,
      ),
    );
    await syncSharedAcrossUsers(existing.sharedGroupId, existing.participantUserIds, (memberTask) => ({
      ...memberTask,
      completed,
      cancelled: false,
      snoozedUntil: undefined,
      ringing: false,
      repeatingNotificationId: undefined,
    }));
  }, [tasks, syncSharedAcrossUsers]);

  const cancelTask = useCallback(async (id: string) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    const cancelled = !existing.cancelled;
    if (existing.notificationId) await cancelNotification(existing.notificationId);
    if (existing.repeatingNotificationId) await cancelNotification(existing.repeatingNotificationId);
    let notificationId: string | undefined;
    if (!cancelled && existing.alarm && !existing.completed) {
      notificationId = await scheduleTaskAlarm({
        taskId: existing.id,
        title: existing.title,
        notes: existing.notes,
        date: existing.date,
        time: existing.time,
        alarmTone: existing.alarmTone,
      });
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, cancelled, notificationId, snoozedUntil: undefined, ringing: false, repeatingNotificationId: undefined }
          : t,
      ),
    );
    await syncSharedAcrossUsers(existing.sharedGroupId, existing.participantUserIds, (memberTask) => ({
      ...memberTask,
      cancelled,
      snoozedUntil: undefined,
      ringing: false,
      repeatingNotificationId: undefined,
    }));
  }, [tasks, syncSharedAcrossUsers]);

  const setSnoozedUntil = useCallback(async (id: string, ts: number, notificationId?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              snoozedUntil: ts,
              notificationId,
              ringing: false,
              repeatingNotificationId: undefined,
            }
          : t,
      ),
    );
  }, []);

  const stopAlarm = useCallback(async (id: string) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    stopTone();
    if (existing.repeatingNotificationId) {
      await cancelNotification(existing.repeatingNotificationId);
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ringing: false, repeatingNotificationId: undefined } : t,
      ),
    );
  }, [tasks]);

  const snoozeAlarm = useCallback(async (id: string, minutes?: number) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    stopTone();
    if (existing.notificationId) await cancelNotification(existing.notificationId);
    if (existing.repeatingNotificationId) await cancelNotification(existing.repeatingNotificationId);
    const minutesToUse = minutes ?? existing.snoozeMinutes ?? 10;
    const result = await scheduleSnooze({
      taskId: existing.id,
      title: existing.title,
      notes: existing.notes,
      minutes: minutesToUse,
      alarmTone: existing.alarmTone,
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              snoozedUntil: result.triggerAt,
              notificationId: result.id,
              ringing: false,
              repeatingNotificationId: undefined,
            }
          : t,
      ),
    );
  }, [tasks]);

  const activeRingingTask = useMemo(() => tasks.find((t) => t.ringing) ?? null, [tasks]);

  const tasksForDate = useCallback(
    (date: string, filter: FilterTab = "All", search = "") => {
      const result: Task[] = [];
      for (const t of tasks) {
        const expanded = expandRecurring(t, date);
        if (!expanded) continue;
        if (!matchesFilter(expanded, filter)) continue;
        if (!matchesSearch(expanded, search)) continue;
        result.push(expanded);
      }
      return result.sort((a, b) => a.time.localeCompare(b.time));
    },
    [tasks],
  );

  const tasksMarkedDates = useCallback(() => {
    const map: Record<string, { dots: { color: string; key: string }[] }> = {};
    const horizon = 60;
    const today = new Date();
    for (const t of tasks) {
      const color = CATEGORY_COLORS[t.category];
      const baseDates = new Set<string>();
      baseDates.add(t.date);
      if (t.recurring !== "None") {
        for (let i = 0; i < horizon; i++) {
          const futureYmd = addDaysYMD(
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
              today.getDate(),
            ).padStart(2, "0")}`,
            i,
          );
          if (expandRecurring(t, futureYmd)) baseDates.add(futureYmd);
        }
      }
      for (const d of baseDates) {
        if (!map[d]) map[d] = { dots: [] };
        if (!map[d].dots.find((dot) => dot.key === t.category)) {
          map[d].dots.push({ key: t.category, color });
        }
      }
    }
    return map;
  }, [tasks]);

  const searchTasks = useCallback(
    (query: string, filter: FilterTab = "All") => {
      return tasks
        .filter((t) => matchesFilter(t, filter) && matchesSearch(t, query))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    },
    [tasks],
  );

  const upcomingTasks = useCallback(() => {
    const now = Date.now();
    return tasks
      .filter((t) => !t.cancelled)
      .filter((t) => {
        const ts = new Date(`${t.date}T${t.time}:00`).getTime();
        return ts >= now - 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [tasks]);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      loaded,
      addTask,
      updateTask,
      deleteTask,
      toggleComplete,
      cancelTask,
      setSnoozedUntil,
      stopAlarm,
      snoozeAlarm,
      activeRingingTask,
      tasksForDate,
      tasksMarkedDates,
      searchTasks,
      upcomingTasks,
    }),
    [
      tasks,
      loaded,
      addTask,
      updateTask,
      deleteTask,
      toggleComplete,
      cancelTask,
      setSnoozedUntil,
      stopAlarm,
      snoozeAlarm,
      activeRingingTask,
      tasksForDate,
      tasksMarkedDates,
      searchTasks,
      upcomingTasks,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}

export { CATEGORY_COLORS };

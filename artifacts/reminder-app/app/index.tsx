import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddTaskSheet } from "@/components/AddTaskSheet";
import { AlarmRingingModal } from "@/components/AlarmRingingModal";
import { EmptyState } from "@/components/EmptyState";
import { FloatingButton } from "@/components/FloatingButton";
import { TaskDetailsModal } from "@/components/TaskDetailsModal";
import { TaskItem } from "@/components/TaskItem";
import { WeekStrip } from "@/components/WeekStrip";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import { FILTER_TABS, type FilterTab, type Task } from "@/types";
import { addDaysYMD, formatDisplayDate, parseYMD, todayYMD } from "@/utils/dates";

function startOfWeek(ymd: string): string {
  const d = parseYMD(ymd);
  const day = d.getDay();
  return addDaysYMD(ymd, -day);
}

function monthLabel(ymd: string): string {
  return parseYMD(ymd).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function toUserId(value: unknown): string {
  return String(value ?? "").trim();
}

function getParticipants(task: Task): string[] {
  const raw = [
    ...(Array.isArray(task.participants) ? task.participants : []),
    ...(Array.isArray(task.participantUserIds) ? task.participantUserIds : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = toUserId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    tasks,
    tasksForDate,
    deleteTask,
    toggleComplete,
    cancelTask,
    activeRingingTask,
    stopAlarm,
    snoozeAlarm,
  } = useTasks();

  const [selectedDate, setSelectedDate] = useState(todayYMD());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayYMD()));
  const [filter, setFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // keep week aligned with selected date
  useEffect(() => {
    const ws = startOfWeek(selectedDate);
    if (ws !== weekStart) setWeekStart(ws);
  }, [selectedDate]);

  const dayTasks = useMemo(
    () => tasksForDate(selectedDate, filter, search),
    [tasksForDate, selectedDate, filter, search],
  );
  const blockTimeSourceTasks = useMemo(
    () => tasksForDate(selectedDate, "All", search),
    [tasksForDate, selectedDate, search],
  );
  const sharedBlockTimeTasks = useMemo(() => {
    const currentUserId = toUserId(user?.id);
    return blockTimeSourceTasks.filter((t) => {
      const participants = getParticipants(t);
      return participants.length > 1 && participants.includes(currentUserId);
    });
  }, [blockTimeSourceTasks, user?.id]);

  const stats = useMemo(() => {
    const today = todayYMD();
    let todayCount = 0;
    let pending = 0;
    let completed = 0;
    for (const t of tasks) {
      if (t.completed) completed++;
      else if (!t.cancelled) pending++;
      if (t.date === today && !t.cancelled) todayCount++;
    }
    return { todayCount, pending, completed };
  }, [tasks]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 16) : insets.top + 8;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <StatusBar style="dark" backgroundColor={c.background} />

      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.appTitle, { color: c.foreground }]}>
              {monthLabel(selectedDate)}
            </Text>
            <Text style={[styles.appSub, { color: c.mutedForeground }]}>
              {user ? `Hi, ${user.name.split(" ")[0]} · ` : ""}
              {formatDisplayDate(selectedDate)}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setSelectedDate(todayYMD());
              setWeekStart(startOfWeek(todayYMD()));
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={[styles.iconBtn, { borderColor: c.border }]}
            hitSlop={6}
          >
            <Feather name="calendar" size={16} color={c.foreground} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            style={[styles.iconBtn, { borderColor: c.border }]}
            hitSlop={6}
          >
            <Feather name="settings" size={16} color={c.foreground} />
          </Pressable>
          {user ? (
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={6}
              style={[styles.headerAvatar, { backgroundColor: user.color }]}
            >
              <Text style={styles.headerAvatarText}>
                {user.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatChip
          label="Today"
          value={stats.todayCount}
          color={c.primary}
          icon="calendar"
        />
        <StatChip
          label="Pending"
          value={stats.pending}
          color="#f9ab00"
          icon="clock"
        />
        <StatChip
          label="Completed"
          value={stats.completed}
          color={c.success}
          icon="check-circle"
        />
      </View>

      <WeekStrip
        selected={selectedDate}
        weekStart={weekStart}
        onSelect={(ymd) => {
          setSelectedDate(ymd);
          if (Platform.OS !== "web") Haptics.selectionAsync();
        }}
        onShiftWeek={(delta) => {
          const newStart = addDaysYMD(weekStart, delta * 7);
          setWeekStart(newStart);
          setSelectedDate(addDaysYMD(newStart, parseYMD(selectedDate).getDay()));
        }}
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tasks"
            placeholderTextColor={c.mutedForeground}
            style={[styles.searchInput, { color: c.foreground }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTER_TABS.map((f) => {
          const active = f === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? c.primary : c.surface,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? c.primaryForeground : c.foreground },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filter === "Block Time" ? (
        <FlatList
          data={sharedBlockTimeTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={() => toggleComplete(item.id)}
              onDelete={() => deleteTask(item.id)}
              onCancel={() => cancelTask(item.id)}
              onPress={() => setDetailTask(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title={search ? "No matching tasks" : "No tasks for this day"}
              subtitle={search ? "Try a different keyword." : "Tap the + button to add your first task."}
            />
          }
        />
      ) : (
        <FlatList
          data={dayTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: 120,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="inbox"
              title={search ? "No matching tasks" : "No tasks for this day"}
              subtitle={search ? "Try a different keyword." : "Tap the + button to add your first task."}
            />
          }
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={() => toggleComplete(item.id)}
              onDelete={() => deleteTask(item.id)}
              onCancel={() => cancelTask(item.id)}
              onPress={() => setDetailTask(item)}
            />
          )}
        />
      )}

      <FloatingButton onPress={() => setAddOpen(true)} />

      <AddTaskSheet
        visible={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditingTask(null);
        }}
        defaultDate={selectedDate}
        taskToEdit={editingTask}
      />

      <TaskDetailsModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => {
          setDetailTask(null);
          setEditingTask(task);
          setAddOpen(true);
        }}
      />
      <AlarmRingingModal
        task={activeRingingTask}
        onStop={() => {
          if (!activeRingingTask) return;
          stopAlarm(activeRingingTask.id);
        }}
        onSnooze={(minutes) => {
          if (!activeRingingTask) return;
          snoozeAlarm(activeRingingTask.id, minutes);
        }}
      />
    </View>
  );
}

function StatChip({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const c = useColors();
  return (
    <View style={[styles.statChip, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: c.foreground }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: c.mutedForeground }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitle: { fontSize: 18, fontWeight: "700" },
  appSub: { fontSize: 12, marginTop: 1 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 11 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
});

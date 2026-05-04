import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORY_COLORS, useTasks } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import { TONES } from "@/services/sounds";
import type { Task } from "@/types";
import { formatDisplayDate, formatTimeDisplay } from "@/utils/dates";

interface Props {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export function TaskDetailsModal({ task, onClose, onEdit }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { toggleComplete, cancelTask, deleteTask } = useTasks();

  if (!task) return null;

  const accent = CATEGORY_COLORS[task.category];
  const tone = task.alarmTone ? TONES.find((t) => t.id === task.alarmTone) : undefined;

  function formatTimestamp(ts: number): string {
    const d = new Date(ts);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const timePart = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (sameDay) return `Today at ${timePart}`;
    const datePart = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${datePart} at ${timePart}`;
  }

  function handleDelete() {
    if (!task) return;
    Alert.alert(
      "Delete task?",
      `"${task.title}" will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteTask(task.id);
            onClose();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={!!task}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: c.border }]} />
          </View>

          <View style={styles.header}>
            <View style={[styles.categoryDot, { backgroundColor: accent }]} />
            <Text style={[styles.headerCategory, { color: accent }]}>
              {task.category}
            </Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.title,
                {
                  color: task.completed || task.cancelled ? c.mutedForeground : c.foreground,
                  textDecorationLine:
                    task.completed || task.cancelled ? "line-through" : "none",
                },
              ]}
            >
              {task.title}
            </Text>

            <View style={[styles.divider, { backgroundColor: c.border }]} />
            {task.notes ? (
              <DetailRow icon="file-text" label="Notes" value={task.notes} />
            ) : null}

            <DetailRow
              icon="calendar"
              label="Date"
              value={formatDisplayDate(task.date)}
            />
            <DetailRow
              icon="clock"
              label="Time"
              value={formatTimeDisplay(task.time)}
            />
            {task.location ? (
              <DetailRow icon="map-pin" label="Location" value={task.location} />
            ) : null}
            {task.recurring !== "None" ? (
              <DetailRow icon="repeat" label="Repeat" value={task.recurring} />
            ) : null}
            <DetailRow
              icon="bell"
              label="Alarm"
              value={task.alarm ? "On" : "Off"}
            />
            {task.alarm && tone ? (
              <DetailRow
                icon="music"
                label="Tone"
                value={`${tone.emoji}  ${tone.name}`}
              />
            ) : null}
            {task.snoozedUntil && task.snoozedUntil > Date.now() ? (
              <DetailRow
                icon="clock"
                label="Snoozed"
                value={`Until ${formatTimestamp(task.snoozedUntil)}`}
              />
            ) : null}
            {task.voiceNote ? (
              <View style={styles.row}>
                <Ionicons name="mic" size={16} color={c.primary} />
                <Text style={[styles.rowLabel, { color: c.mutedForeground }]}>
                  Voice note
                </Text>
                <Text style={[styles.rowValue, { color: c.foreground }]}>
                  Saved
                </Text>
              </View>
            ) : null}

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            <Pressable
              onPress={() => onEdit(task)}
              style={[
                styles.actionBtn,
                { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
              ]}
            >
              <Feather name="edit-2" size={16} color={c.foreground} />
              <Text style={[styles.actionText, { color: c.foreground }]}>Edit task</Text>
            </Pressable>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => {
                  toggleComplete(task.id);
                  onClose();
                }}
                style={[
                  styles.actionBtn,
                  { backgroundColor: task.completed ? c.muted : c.primary },
                ]}
              >
                <Feather
                  name={task.completed ? "rotate-ccw" : "check"}
                  size={16}
                  color={task.completed ? c.foreground : "#fff"}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: task.completed ? c.foreground : "#fff" },
                  ]}
                >
                  {task.completed ? "Mark incomplete" : "Complete"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  cancelTask(task.id);
                  onClose();
                }}
                style={[
                  styles.actionBtn,
                  { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
                ]}
              >
                <Feather
                  name={task.cancelled ? "rotate-ccw" : "x-circle"}
                  size={16}
                  color={c.foreground}
                />
                <Text style={[styles.actionText, { color: c.foreground }]}>
                  {task.cancelled ? "Restore" : "Cancel task"}
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <Feather name="trash-2" size={16} color={c.destructive} />
              <Text style={[styles.deleteText, { color: c.destructive }]}>
                Delete task
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={c.primary} />
      <Text style={[styles.rowLabel, { color: c.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  handle: { alignItems: "center", paddingTop: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  headerCategory: { fontSize: 13, fontWeight: "700" },
  body: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  divider: { height: 1, marginVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 13, width: 80 },
  rowValue: { fontSize: 14, fontWeight: "500", flex: 1 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteText: { fontSize: 14, fontWeight: "600" },
});

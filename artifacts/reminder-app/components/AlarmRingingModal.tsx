import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import type { Task } from "@/types";

interface Props {
  task: Task | null;
  onStop: () => void;
  onSnooze: (minutes: number) => void;
}

export function AlarmRingingModal({ task, onStop, onSnooze }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const visible = !!task?.ringing;
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(10);

  useEffect(() => {
    if (!task) return;
    setSnoozeMinutes(task.snoozeMinutes ?? 10);
  }, [task?.id, task?.snoozeMinutes]);

  const snoozeLabel = useMemo(
    () => (snoozeMinutes === 1440 ? "Snooze 1 Day" : `Snooze ${snoozeMinutes} min${snoozeMinutes === 1 ? "" : "s"}`),
    [snoozeMinutes],
  );
  const snoozeOptions = useMemo(
    () => [
      { value: 5, label: "5 min" },
      { value: 10, label: "10 min" },
      { value: 15, label: "15 min" },
      { value: 20, label: "20 min" },
      { value: 1440, label: "1 Day" },
    ],
    [],
  );

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.82)" }]}>
        <View style={[styles.card, { backgroundColor: c.background, marginBottom: insets.bottom + 16 }]}>
          <Text style={[styles.status, { color: c.destructive }]}>Alarm Ringing</Text>
          <Text style={[styles.title, { color: c.foreground }]}>{task?.title ?? "Reminder"}</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Tap Stop or Snooze to dismiss this alarm.
          </Text>
          <View style={styles.snoozeOptionsRow}>
            {snoozeOptions.map((opt) => {
              const active = opt.value === snoozeMinutes;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSnoozeMinutes(opt.value)}
                  style={[
                    styles.snoozeChip,
                    {
                      backgroundColor: active ? c.primary : c.surface,
                      borderColor: active ? c.primary : c.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? "#fff" : c.foreground, fontWeight: "700", fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onStop} style={[styles.stopBtn, { backgroundColor: c.destructive }]}>
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={() => onSnooze(snoozeMinutes)}
            style={[styles.snoozeBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Text style={[styles.snoozeText, { color: c.foreground }]}>{snoozeLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  card: {
    borderRadius: 18,
    padding: 20,
  },
  status: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  snoozeOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  snoozeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  stopBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  stopText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  snoozeBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  snoozeText: {
    fontWeight: "700",
    fontSize: 15,
  },
});

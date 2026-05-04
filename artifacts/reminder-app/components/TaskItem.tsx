import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CATEGORY_COLORS } from "@/context/TaskContext";
import { useColors } from "@/hooks/useColors";
import type { Task } from "@/types";
import { formatTimeDisplay } from "@/utils/dates";

interface Props {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onPress?: () => void;
}

export function TaskItem({ task, onToggle, onDelete, onCancel, onPress }: Props) {
  const c = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const accent = CATEGORY_COLORS[task.category];

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -120));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            onDelete();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const completed = task.completed;
  const cancelled = task.cancelled;
  const strike = completed || cancelled;

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.deleteHint,
          { backgroundColor: c.destructive },
        ]}
      >
        <Feather name="trash-2" size={20} color="#fff" />
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...pan.panHandlers}
      >
        <Pressable
          onPress={onPress}
          style={[
            styles.row,
            {
              backgroundColor: c.card,
              borderColor: c.border,
            },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
              onToggle();
            }}
            hitSlop={8}
            style={[
              styles.checkbox,
              {
                borderColor: completed ? accent : c.input,
                backgroundColor: completed ? accent : "transparent",
              },
            ]}
          >
            {completed ? <Feather name="check" size={14} color="#fff" /> : null}
          </Pressable>
          <View style={styles.content}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                {
                  color: strike ? c.mutedForeground : c.foreground,
                  textDecorationLine: strike ? "line-through" : "none",
                },
              ]}
            >
              {task.title}
            </Text>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Feather name="clock" size={12} color={c.mutedForeground} />
                <Text style={[styles.metaText, { color: c.mutedForeground }]}>
                  {formatTimeDisplay(task.time)}
                </Text>
              </View>
              <View style={[styles.tag, { backgroundColor: `${accent}20` }]}>
                <Text style={[styles.tagText, { color: accent }]}>{task.category}</Text>
              </View>
              {task.location ? (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={12} color={c.mutedForeground} />
                  <Text
                    numberOfLines={1}
                    style={[styles.metaText, { color: c.mutedForeground, maxWidth: 120 }]}
                  >
                    {task.location}
                  </Text>
                </View>
              ) : null}
              {task.alarm ? (
                <Ionicons name="alarm-outline" size={14} color={c.mutedForeground} />
              ) : null}
              {task.voiceNote ? (
                <Ionicons name="mic" size={14} color={c.mutedForeground} />
              ) : null}
              {task.recurring !== "None" ? (
                <Feather name="repeat" size={12} color={c.mutedForeground} />
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={onCancel}
            hitSlop={8}
            style={styles.cancelBtn}
          >
            <Feather
              name={cancelled ? "rotate-ccw" : "x-circle"}
              size={18}
              color={c.mutedForeground}
            />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  deleteHint: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cancelBtn: {
    padding: 8,
  },
});

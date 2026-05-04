import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { addDaysYMD, parseYMD, todayYMD } from "@/utils/dates";

interface Props {
  selected: string;
  weekStart: string;
  onSelect: (ymd: string) => void;
  onShiftWeek: (delta: number) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function WeekStrip({ selected, weekStart, onSelect, onShiftWeek }: Props) {
  const c = useColors();
  const today = todayYMD();

  const days = useMemo(() => {
    const arr: { ymd: string; day: number; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const ymd = addDaysYMD(weekStart, i);
      arr.push({ ymd, day: parseYMD(ymd).getDate(), label: DAY_LABELS[i] });
    }
    return arr;
  }, [weekStart]);

  return (
    <View style={styles.container}>
      <View style={styles.labelsRow}>
        {DAY_LABELS.map((l, i) => (
          <Text
            key={i}
            style={[styles.label, { color: c.mutedForeground }]}
          >
            {l}
          </Text>
        ))}
      </View>
      <View style={styles.daysRow}>
        <Pressable onPress={() => onShiftWeek(-1)} hitSlop={8} style={styles.arrow}>
          <Feather name="chevron-left" size={16} color={c.mutedForeground} />
        </Pressable>
        <View style={styles.daysInner}>
          {days.map((d) => {
            const isSelected = d.ymd === selected;
            const isToday = d.ymd === today;
            return (
              <Pressable
                key={d.ymd}
                onPress={() => onSelect(d.ymd)}
                style={styles.dayWrap}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && {
                      backgroundColor: c.primary,
                    },
                    !isSelected && isToday && {
                      borderWidth: 1.5,
                      borderColor: c.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? "#fff"
                          : isToday
                            ? c.primary
                            : c.foreground,
                        fontWeight: isSelected || isToday ? "700" : "500",
                      },
                    ]}
                  >
                    {d.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => onShiftWeek(1)} hitSlop={8} style={styles.arrow}>
          <Feather name="chevron-right" size={16} color={c.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 28,
    marginBottom: 6,
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  daysInner: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  arrow: {
    width: 28,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dayWrap: {
    flex: 1,
    alignItems: "center",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
  },
});

import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}

const ITEM_HEIGHT = 40;

export function TimePicker({ hour, minute, onChange }: Props) {
  const c = useColors();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      hourRef.current?.scrollTo({ y: hour * ITEM_HEIGHT, animated: false });
      const minIdx = minutes.findIndex((m) => m >= minute);
      minRef.current?.scrollTo({
        y: (minIdx === -1 ? 0 : minIdx) * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
  }, []);

  return (
    <View style={[styles.wrap, { borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.mutedForeground }]}>Time</Text>
      <View style={styles.pickerRow}>
        <View style={[styles.col, { borderColor: c.border }]}>
          <View style={[styles.highlight, { backgroundColor: c.accent }]} />
          <ScrollView
            ref={hourRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          >
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                style={styles.item}
                onPress={() => onChange(h, minute)}
              >
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: h === hour ? c.primary : c.foreground,
                      fontWeight: h === hour ? "700" : "400",
                    },
                  ]}
                >
                  {String(h).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <Text style={[styles.colon, { color: c.foreground }]}>:</Text>
        <View style={[styles.col, { borderColor: c.border }]}>
          <View style={[styles.highlight, { backgroundColor: c.accent }]} />
          <ScrollView
            ref={minRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          >
            {minutes.map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.item}
                onPress={() => onChange(hour, m)}
              >
                <Text
                  style={[
                    styles.itemText,
                    {
                      color: m === minute ? c.primary : c.foreground,
                      fontWeight: m === minute ? "700" : "400",
                    },
                  ]}
                >
                  {String(m).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: ITEM_HEIGHT * 3,
    gap: 6,
  },
  col: {
    width: 70,
    height: ITEM_HEIGHT * 3,
    overflow: "hidden",
    position: "relative",
  },
  highlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderRadius: 8,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 22,
  },
  colon: {
    fontSize: 24,
    fontWeight: "700",
  },
});

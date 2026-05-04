import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "calendar", title, subtitle }: Props) {
  const c = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: c.surface }]}>
        <Feather name={icon} size={28} color={c.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

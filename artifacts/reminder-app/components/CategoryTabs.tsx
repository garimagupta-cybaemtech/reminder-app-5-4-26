import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { FILTER_TABS, type FilterTab } from "@/types";

interface Props {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}

export function CategoryTabs({ active, onChange }: Props) {
  const c = useColors();
  return (
    <View style={[styles.wrap, { borderBottomColor: c.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onChange(tab)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? c.primary : "transparent",
                  borderColor: isActive ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.text,
                  { color: isActive ? c.primaryForeground : c.mutedForeground },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});

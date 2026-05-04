import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  onPress: () => void;
  bottom?: number;
}

export function FloatingButton({ onPress, bottom = 96 }: Props) {
  const c = useColors();
  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onPress();
        }}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: c.primary,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: c.primary,
          },
        ]}
      >
        <Feather name="plus" size={28} color={c.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    alignItems: "flex-end",
  },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});

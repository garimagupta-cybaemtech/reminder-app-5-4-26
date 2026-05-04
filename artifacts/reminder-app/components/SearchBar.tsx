import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search tasks" }: Props) {
  const c = useColors();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <Feather name="search" size={18} color={c.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        style={[styles.input, { color: c.foreground }]}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Feather name="x" size={18} color={c.mutedForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});

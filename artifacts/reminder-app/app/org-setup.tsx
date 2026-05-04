import { Stack } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOrganization } from "@/context/OrganizationContext";
import { useColors } from "@/hooks/useColors";

export default function OrganizationSetupScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { organizations, createOrganization, joinOrganization } = useOrganization();
  const [orgName, setOrgName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    const result = await createOrganization(orgName);
    if (!result.ok) setError(result.error);
  }

  async function handleJoin() {
    setError(null);
    const result = await joinOrganization(joinId);
    if (!result.ok) setError(result.error);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, gap: 12 }}>
        <Text style={[styles.title, { color: c.foreground }]}>Organization Setup</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>
          Create a new organization as Admin or join one as Member.
        </Text>

        <Text style={[styles.label, { color: c.mutedForeground }]}>Create Organization</Text>
        <TextInput
          value={orgName}
          onChangeText={setOrgName}
          placeholder="Organization name"
          placeholderTextColor={c.mutedForeground}
          style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.surface }]}
        />
        <Pressable onPress={handleCreate} style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={styles.btnText}>Create Organization</Text>
        </Pressable>

        <Text style={[styles.label, { color: c.mutedForeground }]}>Join Organization</Text>
        <TextInput
          value={joinId}
          onChangeText={setJoinId}
          placeholder="Enter organization ID"
          placeholderTextColor={c.mutedForeground}
          style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.surface }]}
        />
        <Pressable onPress={handleJoin} style={[styles.btn, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
          <Text style={[styles.btnText, { color: c.foreground }]}>Join Organization</Text>
        </Pressable>

        {error ? <Text style={{ color: c.destructive, fontSize: 13 }}>{error}</Text> : null}

        <Text style={[styles.label, { color: c.mutedForeground }]}>Available Organizations</Text>
        {organizations.map((org) => (
          <Pressable
            key={org.id}
            onPress={() => setJoinId(org.id)}
            style={[styles.orgCard, { borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={[styles.orgName, { color: c.foreground }]}>{org.name}</Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{org.id}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  orgCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  orgName: { fontSize: 14, fontWeight: "600" },
});

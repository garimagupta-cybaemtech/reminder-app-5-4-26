import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { playTone, stopTone, TONES } from "@/services/sounds";

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, users, logout } = useAuth();
  const { organization, organizationMembers, role, addMember, removeMember } = useOrganization();
  const { settings, setAlarmTone } = useSettings();

  useEffect(() => {
    return () => stopTone();
  }, []);

  function handleLogout() {
    Alert.alert("Sign out?", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          stopTone();
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  function handleSelect(toneId: string) {
    setAlarmTone(toneId);
    playTone(toneId);
  }

  async function handleAddMember(userId: string) {
    const res = await addMember(userId);
    if (!res.ok) Alert.alert("Unable to add member", res.error);
  }

  async function handleRemoveMember(userId: string) {
    const res = await removeMember(userId);
    if (!res.ok) Alert.alert("Unable to remove member", res.error);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Settings",
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.foreground,
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <View style={[styles.profile, { borderBottomColor: c.border }]}>
            <View style={[styles.avatar, { backgroundColor: user.color }]}>
              <Text style={styles.avatarText}>
                {user.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: c.foreground }]}>
                {user.name}
              </Text>
              <Text style={[styles.profileMeta, { color: c.mutedForeground }]}>
                @{user.username}
              </Text>
            </View>
            <Pressable
              onPress={handleLogout}
              style={[styles.logoutBtn, { borderColor: c.destructive }]}
            >
              <Feather name="log-out" size={14} color={c.destructive} />
              <Text style={[styles.logoutText, { color: c.destructive }]}>
                Sign out
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
          Alarm tone
        </Text>
        <Text style={[styles.helper, { color: c.mutedForeground }]}>
          This tone will play when an alarm fires. Tap a tone to preview.
        </Text>

        <View style={styles.toneList}>
          {TONES.map((t) => {
            const active = t.id === settings.alarmTone;
            return (
              <Pressable
                key={t.id}
                onPress={() => handleSelect(t.id)}
                style={[
                  styles.toneRow,
                  {
                    backgroundColor: active ? c.accent : c.surface,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text style={styles.toneEmoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toneName, { color: c.foreground }]}>
                    {t.name}
                  </Text>
                  <Text style={[styles.toneSub, { color: c.mutedForeground }]}>
                    Tap to preview
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    playTone(t.id);
                  }}
                  hitSlop={8}
                  style={[styles.playBtn, { borderColor: c.border }]}
                >
                  <Ionicons name="play" size={14} color={c.primary} />
                </Pressable>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: active ? c.primary : c.input,
                      backgroundColor: active ? c.primary : "transparent",
                    },
                  ]}
                >
                  {active ? <Feather name="check" size={12} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
          About
        </Text>
        <View style={styles.aboutRow}>
          <Feather name="info" size={16} color={c.mutedForeground} />
          <Text style={[styles.aboutText, { color: c.mutedForeground }]}>
            Reminder & Task Manager · v1.0.0
          </Text>
        </View>
        <View style={styles.aboutRow}>
          <Feather name="shield" size={16} color={c.mutedForeground} />
          <Text style={[styles.aboutText, { color: c.mutedForeground }]}>
            Each user's data is private to that user on this device.
          </Text>
        </View>

        {organization ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Organization</Text>
            <View style={styles.aboutRow}>
              <Feather name="users" size={16} color={c.mutedForeground} />
              <Text style={[styles.aboutText, { color: c.foreground }]}>
                {organization.name} ({organization.id})
              </Text>
            </View>
            <View style={styles.aboutRow}>
              <Feather name="key" size={16} color={c.mutedForeground} />
              <Text style={[styles.aboutText, { color: c.mutedForeground }]}>
                Your role: {role}
              </Text>
            </View>
            <View style={styles.toneList}>
              {organizationMembers.map((m) => (
                <View key={m.user.id} style={[styles.toneRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={[styles.avatar, { backgroundColor: m.user.color, width: 32, height: 32, borderRadius: 16 }]}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>
                      {m.user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toneName, { color: c.foreground }]}>{m.user.name}</Text>
                    <Text style={[styles.toneSub, { color: c.mutedForeground }]}>{m.role}</Text>
                  </View>
                  {role === "Admin" && m.user.id !== user?.id ? (
                    <Pressable onPress={() => handleRemoveMember(m.user.id)} style={[styles.playBtn, { borderColor: c.destructive }]}>
                      <Feather name="user-minus" size={14} color={c.destructive} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
            {role === "Admin" ? (
              <>
                <Text style={[styles.helper, { color: c.mutedForeground }]}>Add members</Text>
                <View style={styles.toneList}>
                  {users
                    .filter((u) => !organizationMembers.some((m) => m.user.id === u.id))
                    .map((u) => (
                      <Pressable
                        key={u.id}
                        onPress={() => handleAddMember(u.id)}
                        style={[styles.toneRow, { backgroundColor: c.surface, borderColor: c.border }]}
                      >
                        <Text style={[styles.toneName, { color: c.foreground, flex: 1 }]}>{u.name}</Text>
                        <Feather name="user-plus" size={14} color={c.primary} />
                      </Pressable>
                    ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileMeta: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  logoutText: { fontSize: 12, fontWeight: "600" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  helper: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toneList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toneEmoji: { fontSize: 22 },
  toneName: { fontSize: 14, fontWeight: "600" },
  toneSub: { fontSize: 11, marginTop: 1 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  aboutText: { fontSize: 13 },
});

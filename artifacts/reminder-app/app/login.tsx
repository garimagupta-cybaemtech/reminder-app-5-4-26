import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { login, signup, users, rememberedUser, continueWithRememberedSession } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (mode === "signin") {
      const result = await login(email, password);
      if (!result.ok) setError(result.error);
      return;
    }
    const result = await signup({ name, email, password });
    if (!result.ok) setError(result.error);
  }

  function fillDemo() {
    const u = users[0];
    if (!u) return;
    setEmail(u.email);
    setPassword("");
    setName(u.name);
    setError(null);
  }

  async function handleContinue() {
    setError(null);
    const result = await continueWithRememberedSession();
    if (!result.ok) setError(result.error);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={[styles.logo, { backgroundColor: c.primary }]}>
              <Ionicons name="checkmark-done" size={28} color="#fff" />
            </View>
            <Text style={[styles.brand, { color: c.foreground }]}>Reminder</Text>
          </View>
          <Text style={[styles.tagline, { color: c.mutedForeground }]}>
            {mode === "signin" ? "Welcome back. Sign in to continue." : "Create your account."}
          </Text>

          {rememberedUser ? (
            <Pressable onPress={handleContinue} style={[styles.continueBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={{ color: c.foreground, fontWeight: "600" }}>
                Continue as {rememberedUser.name}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("signin")}
              style={[styles.modeBtn, { backgroundColor: mode === "signin" ? c.primary : c.surface, borderColor: c.border }]}
            >
              <Text style={{ color: mode === "signin" ? "#fff" : c.foreground, fontWeight: "700" }}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("signup")}
              style={[styles.modeBtn, { backgroundColor: mode === "signup" ? c.primary : c.surface, borderColor: c.border }]}
            >
              <Text style={{ color: mode === "signup" ? "#fff" : c.foreground, fontWeight: "700" }}>Sign Up</Text>
            </Pressable>
          </View>

          {mode === "signup" ? (
            <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name="user-check" size={16} color={c.mutedForeground} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.foreground }]}
              />
            </View>
          ) : null}

          <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name="mail" size={16} color={c.mutedForeground} />
              <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={c.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: c.foreground }]}
              />
          </View>

          <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Feather name="lock" size={16} color={c.mutedForeground} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={c.mutedForeground}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: c.foreground }]}
              onSubmitEditing={() => {
                handleSubmit().catch(() => undefined);
              }}
            />
            <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8}>
              <Feather name={showPwd ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
            </Pressable>
          </View>

          {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}

          <Pressable onPress={() => handleSubmit().catch(() => undefined)} style={[styles.signIn, { backgroundColor: c.primary }]}>
            <Text style={styles.signInText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
          </Pressable>

          <Pressable onPress={fillDemo} style={[styles.demoBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={{ color: c.foreground }}>Use first demo account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 28, fontWeight: "700" },
  tagline: { fontSize: 14, marginBottom: 12 },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  error: { fontSize: 13, paddingHorizontal: 4 },
  signIn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  signInText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  demoBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  continueBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});

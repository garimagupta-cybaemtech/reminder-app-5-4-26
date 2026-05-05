import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OrganizationProvider, useOrganization } from "@/context/OrganizationContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { TaskProvider } from "@/context/TaskContext";
import { configureFirestore } from "@/services/firebase";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading || orgLoading) return;
    const onLogin = segments[0] === "login";
    const onOrgSetup = segments[0] === "org-setup";
    if (!user && !onLogin) {
      router.replace("/login");
      return;
    }
    if (user && onLogin) {
      router.replace(organization ? "/" : "/org-setup");
      return;
    }
    if (user && !organization && !onOrgSetup) {
      router.replace("/org-setup");
      return;
    }
    if (user && organization && onOrgSetup) {
      router.replace("/");
    }
  }, [user, loading, organization?.id, orgLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="org-setup" options={{ headerShown: false }} />
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" options={{ headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    configureFirestore();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <OrganizationProvider>
                  <SettingsProvider>
                    <TaskProvider>
                      <AuthGate>
                        <RootLayoutNav />
                      </AuthGate>
                    </TaskProvider>
                  </SettingsProvider>
                </OrganizationProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

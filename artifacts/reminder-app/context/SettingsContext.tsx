import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { loadSettings, saveSettings } from "@/storage/settingsStorage";
import { DEFAULT_SETTINGS, type Settings } from "@/types";

interface SettingsContextValue {
  settings: Settings;
  setAlarmTone: (toneId: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    loadSettings(user.id).then((s) => setSettings(s));
  }, [user?.id]);

  const setAlarmTone = useCallback(
    async (toneId: string) => {
      if (!user) return;
      const next: Settings = { ...settings, alarmTone: toneId };
      setSettings(next);
      await saveSettings(user.id, next);
    },
    [user, settings],
  );

  const value = useMemo(() => ({ settings, setAlarmTone }), [settings, setAlarmTone]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

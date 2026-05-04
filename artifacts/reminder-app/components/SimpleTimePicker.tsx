import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function to12(h24: number): { h: number; ampm: "AM" | "PM" } {
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return { h, ampm };
}

function to24(h12: number, ampm: "AM" | "PM"): number {
  let h = h12 % 12;
  if (ampm === "PM") h += 12;
  return h;
}

export function SimpleTimePicker({ hour, minute, onChange }: Props) {
  const c = useColors();
  const init = to12(hour);
  const [hStr, setHStr] = useState(String(init.h).padStart(2, "0"));
  const [mStr, setMStr] = useState(String(minute).padStart(2, "0"));
  const [ampm, setAmpm] = useState<"AM" | "PM">(init.ampm);

  // Sync from props (e.g. when reset on open)
  useEffect(() => {
    const next = to12(hour);
    setHStr(String(next.h).padStart(2, "0"));
    setMStr(String(minute).padStart(2, "0"));
    setAmpm(next.ampm);
  }, [hour, minute]);

  function commit(nextH12: number, nextM: number, nextAmpm: "AM" | "PM") {
    const safeH = clamp(nextH12 || 12, 1, 12);
    const safeM = clamp(nextM, 0, 59);
    onChange(to24(safeH, nextAmpm), safeM);
  }

  function bumpHour(delta: number) {
    let h = parseInt(hStr, 10) || 12;
    h = ((h - 1 + delta + 12) % 12) + 1;
    setHStr(String(h).padStart(2, "0"));
    commit(h, parseInt(mStr, 10) || 0, ampm);
  }
  function bumpMinute(delta: number) {
    let m = parseInt(mStr, 10) || 0;
    m = (m + delta + 60) % 60;
    setMStr(String(m).padStart(2, "0"));
    commit(parseInt(hStr, 10) || 12, m, ampm);
  }
  function setAmpmAndCommit(v: "AM" | "PM") {
    setAmpm(v);
    commit(parseInt(hStr, 10) || 12, parseInt(mStr, 10) || 0, v);
  }

  return (
    <View style={styles.row}>
      <View style={styles.fieldGroup}>
        <Pressable
          onPress={() => bumpHour(1)}
          hitSlop={6}
          style={[styles.bump, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Feather name="chevron-up" size={16} color={c.foreground} />
        </Pressable>
        <TextInput
          value={hStr}
          onChangeText={(v) => setHStr(v.replace(/[^0-9]/g, "").slice(0, 2))}
          onBlur={() => {
            const n = clamp(parseInt(hStr, 10) || 12, 1, 12);
            const s = String(n).padStart(2, "0");
            setHStr(s);
            commit(n, parseInt(mStr, 10) || 0, ampm);
          }}
          keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
          maxLength={2}
          style={[
            styles.input,
            { color: c.foreground, borderColor: c.border, backgroundColor: c.background },
          ]}
          selectTextOnFocus
        />
        <Pressable
          onPress={() => bumpHour(-1)}
          hitSlop={6}
          style={[styles.bump, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Feather name="chevron-down" size={16} color={c.foreground} />
        </Pressable>
      </View>

      <Text style={[styles.colon, { color: c.foreground }]}>:</Text>

      <View style={styles.fieldGroup}>
        <Pressable
          onPress={() => bumpMinute(1)}
          hitSlop={6}
          style={[styles.bump, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Feather name="chevron-up" size={16} color={c.foreground} />
        </Pressable>
        <TextInput
          value={mStr}
          onChangeText={(v) => setMStr(v.replace(/[^0-9]/g, "").slice(0, 2))}
          onBlur={() => {
            const n = clamp(parseInt(mStr, 10) || 0, 0, 59);
            const s = String(n).padStart(2, "0");
            setMStr(s);
            commit(parseInt(hStr, 10) || 12, n, ampm);
          }}
          keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
          maxLength={2}
          style={[
            styles.input,
            { color: c.foreground, borderColor: c.border, backgroundColor: c.background },
          ]}
          selectTextOnFocus
        />
        <Pressable
          onPress={() => bumpMinute(-1)}
          hitSlop={6}
          style={[styles.bump, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Feather name="chevron-down" size={16} color={c.foreground} />
        </Pressable>
      </View>

      <View style={[styles.ampmGroup, { borderColor: c.border }]}>
        {(["AM", "PM"] as const).map((v) => {
          const active = ampm === v;
          return (
            <Pressable
              key={v}
              onPress={() => setAmpmAndCommit(v)}
              style={[
                styles.ampmBtn,
                { backgroundColor: active ? c.primary : "transparent" },
              ]}
            >
              <Text
                style={[
                  styles.ampmText,
                  { color: active ? "#fff" : c.foreground, fontWeight: active ? "700" : "500" },
                ]}
              >
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  fieldGroup: {
    alignItems: "center",
    gap: 4,
  },
  bump: {
    width: 56,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: 64,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  colon: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 0,
    marginTop: -8,
  },
  ampmGroup: {
    marginLeft: 8,
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "column",
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
  },
  ampmText: {
    fontSize: 13,
  },
});

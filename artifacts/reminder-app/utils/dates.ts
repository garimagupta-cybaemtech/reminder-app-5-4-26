export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatHM(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function combineDateAndTime(ymd: string, hm: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0, 0);
}

export function todayYMD(): string {
  return formatYMD(new Date());
}

export function addDaysYMD(ymd: string, days: number): string {
  const d = parseYMD(ymd);
  d.setDate(d.getDate() + days);
  return formatYMD(d);
}

export function presetToDate(preset: "Today" | "Tomorrow" | "Day after tomorrow"): string {
  const offsets = { Today: 0, Tomorrow: 1, "Day after tomorrow": 2 } as const;
  return addDaysYMD(todayYMD(), offsets[preset]);
}

export function formatDisplayDate(ymd: string): string {
  const d = parseYMD(ymd);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(ymd: string): string {
  const d = parseYMD(ymd);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatTimeDisplay(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const date = new Date();
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

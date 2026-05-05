import { Platform } from "react-native";
import firestore from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

import { configureFirestore, db } from "@/services/firebase";

export interface FirestoreTaskInput {
  taskId?: string;
  title: string;
  notes?: string;
  category?: string;
  date: string;
  time: string;
  location?: string;
  repeat?: string;
  alarmEnabled?: boolean;
  alarmTone?: string;
  snoozeMinutes?: number;
  createdBy: string;
  participants: string[];
}

export interface FirestoreTaskRecord extends FirestoreTaskInput {
  id: string;
  createdAt: number;
  updatedAt: number;
}

const TASKS_COLLECTION = "tasks";

function normalizeUserId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeParticipants(values: unknown[], creatorId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = normalizeUserId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  const creator = normalizeUserId(creatorId);
  if (creator && !seen.has(creator)) out.unshift(creator);
  return out;
}

function toRecord(id: string, data: FirebaseFirestoreTypes.DocumentData): FirestoreTaskRecord {
  const createdAtTs = data.createdAt as FirebaseFirestoreTypes.Timestamp | undefined;
  const updatedAtTs = data.updatedAt as FirebaseFirestoreTypes.Timestamp | undefined;
  return {
    id,
    title: String(data.title ?? ""),
    notes: data.notes ? String(data.notes) : undefined,
    category: data.category ? String(data.category) : undefined,
    date: String(data.date ?? ""),
    time: String(data.time ?? ""),
    location: data.location ? String(data.location) : undefined,
    repeat: data.repeat ? String(data.repeat) : undefined,
    alarmEnabled: !!data.alarmEnabled,
    alarmTone: data.alarmTone ? String(data.alarmTone) : undefined,
    snoozeMinutes:
      typeof data.snoozeMinutes === "number" ? data.snoozeMinutes : undefined,
    createdBy: String(data.createdBy ?? ""),
    participants: Array.isArray(data.participants)
      ? data.participants.map((x: unknown) => String(x))
      : [],
    createdAt: createdAtTs?.toMillis?.() ?? 0,
    updatedAt: updatedAtTs?.toMillis?.() ?? 0,
  };
}

export async function addTaskToFirestore(input: FirestoreTaskInput): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error("Firestore native module is not available on web.");
  }
  configureFirestore();

  const createdBy = normalizeUserId(input.createdBy);
  if (!createdBy) throw new Error("createdBy is required.");

  const participants = normalizeParticipants(input.participants ?? [], createdBy);
  if (!participants.length) throw new Error("participants are required.");

  const doc = {
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    category: input.category?.trim() || null,
    date: input.date,
    time: input.time,
    location: input.location?.trim() || null,
    repeat: input.repeat?.trim() || "None",
    alarmEnabled: !!input.alarmEnabled,
    alarmTone: input.alarmTone?.trim() || null,
    snoozeMinutes: typeof input.snoozeMinutes === "number" ? input.snoozeMinutes : null,
    createdBy,
    participants,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  const forcedTaskId = normalizeUserId(input.taskId);
  if (forcedTaskId) {
    await db.collection(TASKS_COLLECTION).doc(forcedTaskId).set(doc, { merge: true });
    return forcedTaskId;
  }
  const ref = await db.collection(TASKS_COLLECTION).add(doc);
  return ref.id;
}

export function subscribeToUserTasks(
  userId: string,
  onChange: (tasks: FirestoreTaskRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (Platform.OS === "web") {
    onChange([]);
    return () => undefined;
  }
  configureFirestore();

  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    onChange([]);
    return () => undefined;
  }

  return db
    .collection(TASKS_COLLECTION)
    .where("participants", "array-contains", normalizedUserId)
    .onSnapshot(
      (snap) => {
        const tasks = snap.docs
          .map((docSnap) => toRecord(docSnap.id, docSnap.data()))
          .sort((a, b) => {
            const left = `${a.date} ${a.time}`;
            const right = `${b.date} ${b.time}`;
            return left.localeCompare(right);
          });
        onChange(tasks);
      },
      (err) => {
        if (onError) onError(err);
      },
    );
}

import { useEffect, useState } from "react";

import {
  subscribeToUserTasks,
  type FirestoreTaskRecord,
} from "@/services/firestoreTasks";

export function useFirestoreTasks(userId?: string) {
  const [tasks, setTasks] = useState<FirestoreTaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId?.trim()) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToUserTasks(
      userId,
      (next) => {
        setTasks(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to fetch tasks.");
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { tasks, loading, error };
}


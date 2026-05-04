import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export interface VoiceController {
  isRecording: boolean;
  durationSec: number;
  recordingUri: string | null;
  available: boolean;
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  reset: () => void;
  error: string | null;
}

export function useVoiceRecorder(): VoiceController {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const available = Platform.OS !== "web";

  useEffect(() => {
    if (recorderState.isRecording) {
      if (startedAt.current === null) startedAt.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startedAt.current) {
          setDurationSec(Math.floor((Date.now() - startedAt.current) / 1000));
        }
      }, 250);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recorderState.isRecording]);

  const start = useCallback(async () => {
    setError(null);
    if (!available) {
      setError("Voice recording is not supported in the web preview.");
      return;
    }
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError("Microphone permission denied.");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setDurationSec(0);
      setRecordingUri(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start recording";
      setError(msg);
    }
  }, [available, recorder]);

  const stop = useCallback(async (): Promise<string | null> => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecordingUri(uri ?? null);
      startedAt.current = null;
      return uri ?? null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not stop recording";
      setError(msg);
      return null;
    }
  }, [recorder]);

  const reset = useCallback(() => {
    setRecordingUri(null);
    setDurationSec(0);
    setError(null);
    startedAt.current = null;
  }, []);

  return {
    isRecording: recorderState.isRecording,
    durationSec,
    recordingUri,
    available,
    start,
    stop,
    reset,
    error,
  };
}

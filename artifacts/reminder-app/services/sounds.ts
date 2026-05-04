import { AudioModule, createAudioPlayer } from "expo-audio";
import { Platform } from "react-native";

export interface ToneOption {
  id: string;
  name: string;
  module: number;
  emoji: string;
}

export const TONES: ToneOption[] = [
  {
    id: "bell",
    name: "Bell",
    emoji: "🔔",
    module: require("../assets/sounds/bell.wav"),
  },
  {
    id: "chime",
    name: "Chime",
    emoji: "🎶",
    module: require("../assets/sounds/chime.wav"),
  },
  {
    id: "beep",
    name: "Beep",
    emoji: "📟",
    module: require("../assets/sounds/beep.wav"),
  },
  {
    id: "gentle",
    name: "Gentle",
    emoji: "🌿",
    module: require("../assets/sounds/gentle.wav"),
  },
  {
    id: "marimba",
    name: "Marimba",
    emoji: "🪘",
    module: require("../assets/sounds/marimba.wav"),
  },
];

export function getTone(id: string): ToneOption {
  return TONES.find((t) => t.id === id) ?? TONES[0];
}

let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let loopToneId: string | null = null;

async function playOnce(id: string): Promise<void> {
  const tone = getTone(id);
  if (currentPlayer) {
    try {
      currentPlayer.remove();
    } catch {
      /* noop */
    }
    currentPlayer = null;
  }
  const player = createAudioPlayer(tone.module);
  currentPlayer = player;
  player.play();
}

export async function playTone(id: string): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
      } catch {
        /* noop */
      }
    }
    await playOnce(id);
  } catch {
    /* noop */
  }
}

export async function startLoopingTone(id: string): Promise<void> {
  loopToneId = id;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  await playTone(id);
  // Re-trigger playback to emulate continuous looping across platforms.
  loopTimer = setInterval(() => {
    if (!loopToneId) return;
    playTone(loopToneId).catch(() => undefined);
  }, 3500);
}

export function stopTone() {
  loopToneId = null;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch {
      /* noop */
    }
    currentPlayer = null;
  }
}

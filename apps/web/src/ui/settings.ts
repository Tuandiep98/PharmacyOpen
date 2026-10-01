import { create } from "zustand";

const KEY = "idle-pharmacy.settings.v1";

interface Settings {
  sound: boolean;
  reducedEffects: boolean;
  toggleSound: () => void;
  toggleReducedEffects: () => void;
}

function load(): Pick<Settings, "sound" | "reducedEffects"> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        sound?: unknown;
        reducedEffects?: unknown;
      };
      return {
        sound: typeof parsed.sound === "boolean" ? parsed.sound : true,
        reducedEffects: parsed.reducedEffects === true,
      };
    }
  } catch {
    // Bộ nhớ bị chặn hoặc dữ liệu hỏng: dùng mặc định.
  }
  return { sound: true, reducedEffects: false };
}

function persist(sound: boolean, reducedEffects: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ sound, reducedEffects }));
  } catch {
    // Storage may be unavailable; settings still work for this session.
  }
}

export function reducedMotion(): boolean {
  return (
    useSettings.getState().reducedEffects ||
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
  );
}

/** Tuỳ chọn riêng từng thiết bị (không phải state game). */
export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  toggleSound: () => {
    const sound = !get().sound;
    set({ sound });
    persist(sound, get().reducedEffects);
  },
  toggleReducedEffects: () => {
    const reducedEffects = !get().reducedEffects;
    set({ reducedEffects });
    persist(get().sound, reducedEffects);
  },
}));

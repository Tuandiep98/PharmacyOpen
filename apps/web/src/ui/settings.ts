import { create } from "zustand";

const KEY = "idle-pharmacy.settings.v1";

interface Settings {
  sound: boolean;
  toggleSound: () => void;
}

function load(): Pick<Settings, "sound"> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sound?: unknown };
      if (typeof parsed.sound === "boolean") return { sound: parsed.sound };
    }
  } catch {
    // Bộ nhớ bị chặn hoặc dữ liệu hỏng: dùng mặc định.
  }
  return { sound: true };
}

/** Tuỳ chọn riêng từng thiết bị (không phải state game). */
export const useSettings = create<Settings>((set, get) => ({
  ...load(),
  toggleSound: () => {
    const sound = !get().sound;
    set({ sound });
    try {
      localStorage.setItem(KEY, JSON.stringify({ sound }));
    } catch {
      // Bỏ qua: chỉ mất ghi nhớ giữa các lần mở.
    }
  },
}));

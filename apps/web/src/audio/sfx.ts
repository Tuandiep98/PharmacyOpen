// Hiệu ứng âm thanh tổng hợp bằng Web Audio (không cần file âm thanh, không vướng bản quyền).
// Chuyển thể từ src/lib/audio/sfx.ts của dự án LLs (cùng tác giả).
import { useSettings } from "../ui/settings";

export type Sfx =
  | "pick"
  | "drop"
  | "sale"
  | "wrong"
  | "warn"
  | "refer"
  | "restock"
  | "arrive"
  | "return"
  | "page"
  | "leave"
  | "milestone"
  /** Mở viên nang ghép đồ: S hoành tráng, A sáng rõ, B/C dùng chung tiếng "bụp" nhẹ. */
  | "gachaS"
  | "gachaA"
  | "gachaB";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!useSettings.getState().sound || document.hidden) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Trình duyệt chỉ cho phát âm thanh sau cử chỉ người dùng: mở khoá ở lần chạm đầu tiên. */
export function unlockAudioOnFirstGesture(): void {
  const unlock = () => {
    if (!audio()) return;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  const sync = () => {
    if (ctx && (!useSettings.getState().sound || document.hidden))
      void ctx.suspend().catch(() => {});
    else if (ctx) audio();
  };
  document.addEventListener("visibilitychange", sync);
  useSettings.subscribe(sync);
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.16,
) {
  // Chưa có cử chỉ người dùng thì không tạo AudioContext (tránh cảnh báo autoplay).
  if (!ctx) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

export function playSfx(name: Sfx): void {
  if (!useSettings.getState().sound || document.hidden) return;
  switch (name) {
    case "pick":
      tone(660, 0, 0.07, "triangle", 0.1);
      break;
    case "drop":
      tone(520, 0, 0.06, "sine");
      tone(880, 0.05, 0.08, "sine");
      break;
    case "sale":
      // Tiếng "ting ting" của máy tính tiền.
      tone(1319, 0, 0.1, "triangle", 0.14);
      tone(1760, 0.08, 0.18, "triangle", 0.14);
      break;
    case "wrong":
      // Nhẹ nhàng, không dùng tiếng còi gắt.
      tone(392, 0, 0.14, "sine", 0.13);
      tone(330, 0.12, 0.22, "sine", 0.13);
      break;
    case "warn":
      tone(587, 0, 0.12, "square", 0.06);
      tone(587, 0.18, 0.12, "square", 0.06);
      break;
    case "refer":
      tone(523, 0, 0.14, "sine", 0.12);
      tone(659, 0.12, 0.14, "sine", 0.12);
      tone(784, 0.24, 0.24, "sine", 0.12);
      break;
    case "restock":
      tone(180, 0, 0.09, "triangle", 0.18);
      tone(240, 0.07, 0.08, "triangle", 0.14);
      break;
    case "arrive":
      // Chuông cửa.
      tone(988, 0, 0.18, "sine", 0.07);
      tone(784, 0.14, 0.26, "sine", 0.07);
      break;
    case "return":
      tone(784, 0, 0.12, "sine", 0.07);
      tone(988, 0.1, 0.18, "sine", 0.07);
      tone(1175, 0.2, 0.16, "sine", 0.05);
      break;
    case "page":
      tone(460, 0, 0.045, "triangle", 0.055);
      tone(620, 0.045, 0.07, "triangle", 0.045);
      break;
    case "leave":
      tone(294, 0, 0.18, "sine", 0.1);
      tone(247, 0.15, 0.28, "sine", 0.1);
      break;
    case "gachaS":
      // Arpeggio vút lên rồi hợp âm ngân, rắc thêm tiếng lấp lánh.
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        tone(f, i * 0.07, 0.16, "triangle", 0.13),
      );
      [1047, 1319, 1568].forEach((f) => tone(f, 0.38, 0.9, "sine", 0.08));
      [2093, 2637, 2349, 3136].forEach((f, i) =>
        tone(f, 0.45 + i * 0.12, 0.14, "sine", 0.035),
      );
      break;
    case "gachaA":
      // Chuông sáng ba nốt rồi một nốt ngân.
      [784, 988, 1175].forEach((f, i) =>
        tone(f, i * 0.08, 0.14, "triangle", 0.12),
      );
      tone(1568, 0.26, 0.42, "sine", 0.08);
      break;
    case "gachaB":
      // Tiếng "bụp" mở nắp nhẹ nhàng.
      tone(440, 0, 0.08, "sine", 0.12);
      tone(660, 0.06, 0.14, "triangle", 0.1);
      break;
    case "milestone":
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
        tone(f, i * 0.11, 0.17, "triangle", 0.14),
      );
      break;
  }
}

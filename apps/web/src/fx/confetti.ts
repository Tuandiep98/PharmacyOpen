// Pháo giấy mừng cột mốc; chuyển thể từ src/games/shared/confetti.ts của dự án LLs.
import confetti from "canvas-confetti";
import { reducedMotion } from "../ui/settings";

const fire = confetti.create(undefined, { resize: true, useWorker: true });

const COLORS = [
  "#7ED6B5",
  "#2F9E7A",
  "#FFD66B",
  "#FF9E9E",
  "#8EC5FF",
  "#B8A4F5",
];

/** Một chùm pháo giấy tại toạ độ tương đối của màn hình (0..1). */
export function burst(x = 0.5, y = 0.45): void {
  if (document.hidden || reducedMotion()) return;
  void fire({
    particleCount: 40,
    spread: 75,
    startVelocity: 34,
    origin: { x, y },
    colors: COLORS,
    scalar: 1.05,
  });
}

/** Pháo giấy bắn từ hai bên trong ~0,8 giây. */
export function celebrate(): void {
  if (document.hidden || reducedMotion()) return;
  for (const [x, angle] of [
    [0, 60],
    [1, 120],
  ]) {
    void fire({
      particleCount: 40,
      angle,
      ticks: 120,
      spread: 60,
      origin: { x, y: 0.7 },
      colors: COLORS,
    });
  }
}

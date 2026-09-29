// Pháo giấy mừng cột mốc; chuyển thể từ src/games/shared/confetti.ts của dự án LLs.
import confetti from "canvas-confetti";

const COLORS = [
  "#7ED6B5",
  "#2F9E7A",
  "#FFD66B",
  "#FF9E9E",
  "#8EC5FF",
  "#B8A4F5",
];

function reducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/** Một chùm pháo giấy tại toạ độ tương đối của màn hình (0..1). */
export function burst(x = 0.5, y = 0.45): void {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 70,
    spread: 75,
    startVelocity: 34,
    origin: { x, y },
    colors: COLORS,
    scalar: 1.05,
  });
}

/** Pháo giấy bắn từ hai bên trong ~0,8 giây. */
export function celebrate(): void {
  if (reducedMotion()) return;
  let frames = 0;
  const frame = () => {
    void confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors: COLORS,
    });
    void confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors: COLORS,
    });
    if (++frames < 50) requestAnimationFrame(frame);
  };
  frame();
}

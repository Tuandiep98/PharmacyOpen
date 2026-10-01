import type { ProductId } from "@pharmacy/simulation";
import { playSfx } from "../audio/sfx";
import { useUi } from "./uiStore";

/** Khoảng di chuyển tối thiểu (px) để coi là kéo thay vì chạm. */
const DRAG_THRESHOLD = 8;

/** Phần tử nhận thả phải có thuộc tính `data-drop-target`. */
function dropTarget(x: number, y: number): string | null {
  return (
    document
      .elementFromPoint(x, y)
      ?.closest("[data-drop-target]")
      ?.getAttribute("data-drop-target") ?? null
  );
}

/**
 * Bắt đầu theo dõi một cử chỉ trên sản phẩm: di chuyển quá ngưỡng là kéo thả, ngược lại là chạm.
 * Dùng pointer events nên chạy được cả chuột lẫn cảm ứng (nguồn kéo cần `touch-action: none`).
 */
export function beginProductGesture(
  e: React.PointerEvent,
  productId: ProductId,
  handlers: {
    onDrop: (id: ProductId, counterId: string) => void;
    onTap?: (id: ProductId) => void;
    draggable?: boolean;
  },
): void {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const { setDrag } = useUi.getState();
  const startX = e.clientX;
  const startY = e.clientY;
  let dragging = false;
  let frame = 0;
  let latest: { x: number; y: number } | null = null;
  const pointerId = e.pointerId;

  const flush = () => {
    frame = 0;
    if (!latest) return;
    const { x, y } = latest;
    const target = dropTarget(x, y);
    setDrag({ productId, x, y, over: target !== null, target });
  };

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    if (!dragging) {
      if (
        handlers.draggable === false ||
        Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD
      )
        return;
      dragging = true;
      playSfx("pick");
    }
    latest = { x: ev.clientX, y: ev.clientY };
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    cleanup();
    if (dragging) {
      const over = dropTarget(ev.clientX, ev.clientY);
      setDrag(null);
      if (over) handlers.onDrop(productId, over);
    } else if (
      Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD
    ) {
      handlers.onTap?.(productId);
    }
  };
  const cancel = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    abort();
  };
  const abort = () => {
    cleanup();
    setDrag(null);
  };
  function cleanup() {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("blur", abort);
  }
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", abort);
}

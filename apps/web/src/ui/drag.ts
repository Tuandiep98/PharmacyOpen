import type { ProductId } from '@pharmacy/simulation';
import { playSfx } from '../audio/sfx';
import { useUi } from './uiStore';

/** Khoảng di chuyển tối thiểu (px) để coi là kéo thay vì chạm. */
const DRAG_THRESHOLD = 8;

/** Phần tử nhận thả phải có thuộc tính `data-drop-target`. */
function dropTarget(x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest('[data-drop-target]')?.getAttribute('data-drop-target') ?? null;
}

/**
 * Bắt đầu theo dõi một cử chỉ trên sản phẩm: di chuyển quá ngưỡng là kéo thả, ngược lại là chạm.
 * Dùng pointer events nên chạy được cả chuột lẫn cảm ứng (nguồn kéo cần `touch-action: none`).
 */
export function beginProductGesture(
  e: React.PointerEvent,
  productId: ProductId,
  handlers: { onDrop: (id: ProductId, counterId: string) => void; onTap?: (id: ProductId) => void; draggable?: boolean },
): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const { setDrag } = useUi.getState();
  const startX = e.clientX;
  const startY = e.clientY;
  let dragging = false;

  const move = (ev: PointerEvent) => {
    if (!dragging) {
      if (handlers.draggable === false || Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
      dragging = true;
      playSfx('pick');
    }
    const target = dropTarget(ev.clientX, ev.clientY);
    setDrag({ productId, x: ev.clientX, y: ev.clientY, over: target !== null, target });
  };
  const up = (ev: PointerEvent) => {
    cleanup();
    if (dragging) {
      const over = dropTarget(ev.clientX, ev.clientY);
      setDrag(null);
      if (over) handlers.onDrop(productId, over);
    } else if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) {
      handlers.onTap?.(productId);
    }
  };
  const cancel = () => {
    cleanup();
    setDrag(null);
  };
  function cleanup() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}

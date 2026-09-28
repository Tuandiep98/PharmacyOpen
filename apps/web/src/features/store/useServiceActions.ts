import { PLAYER_WORKER_ID, type ProductId } from '@pharmacy/simulation';
import { playSfx } from '../../audio/sfx';
import { useBridge } from '../../game/useGame';
import { useUi } from '../../ui/uiStore';
import { REJECT_TEXT } from './rejectText';

export { PLAYER_WORKER_ID };

/**
 * Gộp nhiều lệnh thành một cử chỉ của người chơi: thả hàng vào khách = bắt đầu phục vụ (nếu chưa)
 * + lấy hàng. Vẫn đi qua đúng các Command và luật kiểm tra mà NPC dùng.
 */
export function useServiceActions() {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);

  const ensureOrder = (): string | null => {
    const s = bridge.state;
    const customerId = s.counters[0]?.customerId;
    if (!customerId) {
      pushToast('info', 'Chưa có khách ở quầy.');
      return null;
    }
    const existing = s.customers[customerId]?.orderId;
    if (existing) return existing;
    const r = bridge.dispatch({ type: 'startService', workerId: PLAYER_WORKER_ID, customerId });
    if (!r.ok) {
      pushToast('bad', REJECT_TEXT[r.reason]);
      return null;
    }
    return bridge.state.customers[customerId]?.orderId ?? null;
  };

  const give = (productId: ProductId) => {
    const orderId = ensureOrder();
    if (!orderId) return;
    const r = bridge.dispatch({ type: 'pickProduct', workerId: PLAYER_WORKER_ID, orderId, productId });
    if (r.ok) playSfx('drop');
    // Cảnh báo an toàn đã có toast và âm thanh riêng từ sự kiện safetyWarning.
    else if (r.reason !== 'safety-referral-required') pushToast('bad', REJECT_TEXT[r.reason]);
  };

  const refer = () => {
    const orderId = ensureOrder();
    if (!orderId) return;
    const r = bridge.dispatch({ type: 'refer', workerId: PLAYER_WORKER_ID, orderId });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };

  const restock = (productId: ProductId) => {
    const r = bridge.dispatch({ type: 'restock', productId });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };

  /** Giao quầy cho nhân viên (hoặc lấy lại cho người chơi). */
  const assignCounter = (workerId: string) => {
    const r = bridge.dispatch({ type: 'assignCounter', counterId: 'counter-1', workerId });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };

  return { give, refer, restock, assignCounter };
}

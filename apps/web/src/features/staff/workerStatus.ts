import { isOnDuty, isPresent, PRODUCTS, type DeepReadonly, type SimState, type Worker } from '@pharmacy/simulation';

export function workerStatus(state: DeepReadonly<SimState>, worker: DeepReadonly<Worker>): string {
  if (worker.task?.kind === 'slack') return 'Đang lướt điện thoại…';
  if (worker.task) return `Đang bổ sung ${PRODUCTS[worker.task.productId].name.toLowerCase()}`;
  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (order) {
    switch (order.state) {
      case 'deciding': return 'Đang nghe khách';
      case 'retrieving': return order.productId ? `Đang lấy ${PRODUCTS[order.productId].name.toLowerCase()}` : 'Đang lấy hàng';
      case 'ready': return 'Chuẩn bị thanh toán';
      case 'checkingOut': return 'Đang thanh toán';
      case 'referring': return 'Đang khuyên khách đi khám';
    }
  }
  if (worker.restDay === state.day) return 'Nghỉ hôm nay';
  if (!isOnDuty(state, worker)) return 'Ngoài ca, đang nghỉ';
  if (!isPresent(state, worker)) return 'Chưa tới ca, đang trên đường';
  if (state.counters.some((c) => c.operatorId === worker.id)) return state.counters.find((c) => c.operatorId === worker.id)?.customerId ? 'Đang nghe khách' : 'Đang chờ khách ở quầy';
  if (worker.controller !== 'ai') return 'Đang nghỉ';
  return worker.station === 'stock' ? 'Ở kho, nhập hàng ngay khi kệ vơi' : 'Rảnh, sẽ tự bổ sung hàng khi kệ gần hết';
}

export function workerProgress(state: DeepReadonly<SimState>, worker: DeepReadonly<Worker>): number | null {
  if (worker.task?.timerTotalMs) return Math.max(0, Math.min(1, 1 - worker.task.timerMs / worker.task.timerTotalMs));
  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (order?.timerTotalMs && ['retrieving', 'checkingOut', 'referring'].includes(order.state)) {
    return Math.max(0, Math.min(1, 1 - order.timerMs / order.timerTotalMs));
  }
  return null;
}

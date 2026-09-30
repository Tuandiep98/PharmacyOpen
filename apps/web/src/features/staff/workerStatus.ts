import {
  isOnDuty,
  isPresent,
  PRODUCTS,
  type DeepReadonly,
  type SimState,
  type Worker,
} from "@pharmacy/simulation";

export function workerStatus(
  state: DeepReadonly<SimState>,
  worker: DeepReadonly<Worker>,
): string {
  if (worker.task?.kind === "slack") return "Đang lướt điện thoại…";
  if (worker.task?.kind === "pack")
    return `Đang gói ${PRODUCTS[worker.task.productId].name.toLowerCase()} vào đơn ship`;
  if (worker.task?.kind === "label") return "Đang ghi phiếu gửi đơn ship";
  if (worker.task)
    return `Đang bổ sung ${PRODUCTS[worker.task.productId].name.toLowerCase()}`;
  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (order) {
    switch (order.state) {
      case "deciding":
        return "Đang nghe khách";
      case "retrieving":
        return order.productId
          ? `Đang lấy ${PRODUCTS[order.productId].name.toLowerCase()}`
          : "Đang lấy hàng";
      case "ready":
        return "Chuẩn bị thanh toán";
      case "checkingOut":
        return "Đang thanh toán";
      case "referring":
        return "Đang khuyên khách đi khám";
      case "deferring":
        return "Đang báo khách tạm hết hàng";
      case "chatting":
        return "Đang trò chuyện với khách quen";
    }
  }
  if (worker.restDay === state.day) return "Nghỉ hôm nay";
  if (!isOnDuty(state, worker)) return "Ngoài ca, đang nghỉ";
  if (!isPresent(state, worker)) return "Chưa tới ca, đang trên đường";
  if (state.counters.some((c) => c.operatorId === worker.id))
    return state.counters.find((c) => c.operatorId === worker.id)?.customerId
      ? "Đang nghe khách"
      : "Đang chờ khách ở quầy";
  if (worker.controller !== "ai") return "Đang nghỉ";
  return worker.station === "stock"
    ? "Ở kho, nhập hàng ngay khi kệ vơi"
    : "Rảnh, sẽ tự bổ sung hàng khi kệ gần hết";
}

/** Nhóm trạng thái để tô huy hiệu: màu luôn đi kèm icon và chữ của `workerStatus`. */
export type WorkerActivity =
  "serving" | "working" | "waiting" | "idle" | "off" | "slack";

export function workerActivity(
  state: DeepReadonly<SimState>,
  worker: DeepReadonly<Worker>,
): WorkerActivity {
  if (worker.task?.kind === "slack") return "slack";
  if (worker.task) return "working";
  if (worker.orderId && state.orders[worker.orderId]) return "serving";
  if (
    worker.restDay === state.day ||
    !isOnDuty(state, worker) ||
    !isPresent(state, worker)
  )
    return "off";
  const counter = state.counters.find((c) => c.operatorId === worker.id);
  if (counter) return counter.customerId ? "serving" : "waiting";
  return "idle";
}

export function workerProgress(
  state: DeepReadonly<SimState>,
  worker: DeepReadonly<Worker>,
): number | null {
  if (worker.task?.timerTotalMs)
    return Math.max(
      0,
      Math.min(1, 1 - worker.task.timerMs / worker.task.timerTotalMs),
    );
  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (
    order?.timerTotalMs &&
    ["retrieving", "checkingOut", "referring", "deferring"].includes(
      order.state,
    )
  ) {
    return Math.max(0, Math.min(1, 1 - order.timerMs / order.timerTotalMs));
  }
  const chat =
    order?.state === "chatting" ? state.customers[order.customerId]?.chat : null;
  if (chat) {
    const elapsed = Math.min(
      1,
      (state.timeMs - chat.stepStartedAtMs) / chat.stepMs,
    );
    return Math.min(1, (chat.step + elapsed) / (chat.planned + 2));
  }
  return null;
}

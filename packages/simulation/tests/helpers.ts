import { REQUESTS, Simulation, type SimState } from "../src";

/**
 * Người chơi mô phỏng đơn giản: luôn gửi lệnh qua dispatch như UI thật.
 * `mistakes` = true thì cố tình chọn sai/bán cho khách có triệu chứng để kiểm tra luật.
 */
export function autoPlay(
  sim: Simulation,
  opts: { mistakes?: boolean } = {},
): void {
  const s: Readonly<SimState> = sim.snapshot as SimState;
  const worker = s.workers["w-player"]!;
  const counterCustomer = s.counters[0]!.customerId;
  if (!worker.orderId && counterCustomer) {
    sim.dispatch({
      type: "startService",
      workerId: worker.id,
      customerId: counterCustomer,
    });
    return;
  }
  const order = worker.orderId ? s.orders[worker.orderId] : undefined;
  if (!order) return;
  const request = REQUESTS[order.requestId]!;
  if (order.state === "deciding") {
    if (opts.mistakes && order.facts.length === 0) {
      sim.dispatch({
        type: "pickProduct",
        workerId: worker.id,
        orderId: order.id,
        productId: request.acceptable[0] === "mask" ? "bandage" : "mask",
      });
      return;
    }
    const pid = request.acceptable[0];
    if (!pid)
      sim.dispatch({ type: "refer", workerId: worker.id, orderId: order.id });
    else if (s.stock[pid].shelf > 0)
      sim.dispatch({
        type: "pickProduct",
        workerId: worker.id,
        orderId: order.id,
        productId: pid,
      });
    else sim.dispatch({ type: "restock", productId: pid });
  } else if (order.state === "ready") {
    sim.dispatch({ type: "checkout", workerId: worker.id, orderId: order.id });
  }
}

export function runFor(
  sim: Simulation,
  ms: number,
  player?: (sim: Simulation) => void,
): void {
  const ticks = Math.ceil(ms / sim.snapshot.config.tickMs);
  for (let i = 0; i < ticks; i++) {
    player?.(sim);
    sim.step();
  }
}

/**
 * Tuyển một hồ sơ cố định và cho làm cả hai ca. Thêm đặc điểm "Trâu bò" để kịch bản chạy nhiều ngày
 * không bị mệt rồi xin nghỉ (test riêng về mệt mỏi nằm ở staff.test.ts).
 */
export function hireAllDay(sim: Simulation, candidateId: string): string {
  const workerId = `w-${candidateId}`;
  if (!sim.dispatch({ type: "hire", candidateId }).ok)
    throw new Error(`không tuyển được ${candidateId}`);
  if (
    !sim.dispatch({
      type: "setShifts",
      workerId,
      shifts: ["morning", "afternoon"],
    }).ok
  )
    throw new Error("không xếp được hai ca");
  (sim.snapshot as SimState).workers[workerId]!.traits.push("ironman");
  return workerId;
}

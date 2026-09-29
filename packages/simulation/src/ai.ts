import { applyCommand } from "./commands";
import { effectiveSpeed } from "./economy";
import { PRODUCT_IDS } from "./content/products";
import { REQUESTS } from "./content/requests";
import type { ProductId } from "./content/types";
import type { Emit } from "./events";
import { nextFloat, nextInt } from "./rng";
import { effectiveKnowledge, hasTrait } from "./recruit";
import type { StationId } from "./content/stations";
import { dayElapsed, isPresent, stationOf } from "./shift";
import { PREP_TASK_IDS, type Order, type SimState, type Worker } from "./types";
import {
  isProductUnlocked,
  stockUnitCost,
  unlockedProducts,
} from "./progression";
import { isOpenDelivery } from "./delivery";

/**
 * "Bộ não" của nhân viên NPC. Không có đường tắt nào: mọi hành động đều gửi đúng các Command
 * mà người chơi dùng, nên cùng bị kiểm tra kho, giá và luật an toàn.
 *
 * FSM một lượt phục vụ: Idle → (startService) Deciding[suy nghĩ] → pickProduct/refer
 *   → Retrieving → Ready → (checkout) → Complete; đưa nhầm → quay lại Deciding.
 * Khi rảnh, chọn việc có điểm cao nhất (utility): phục vụ khách ở quầy được giao > gửi đơn ship đã gói
 * > bổ sung kệ / gói đơn ship (đơn càng sát hạn càng gấp).
 */
export function aiTick(state: SimState, emit: Emit): void {
  for (const worker of Object.values(state.workers)) {
    if (worker.controller !== "ai") continue;
    // Hết ca vẫn làm nốt việc dở, nhưng không nhận việc mới.
    if (worker.task) progressTask(state, worker, emit);
    else if (worker.orderId) handleOrder(state, worker, emit);
    else if (!isPresent(state, worker)) continue;
    else if (state.prep.openedAtMs === null) prepare(state, worker, emit);
    else chooseTask(state, worker, emit);
  }
}

/**
 * Trước giờ mở cửa, NPC đang đứng quầy lần lượt làm các việc chuẩn bị, rải đều trong thời gian
 * chuẩn bị (suy ra từ đồng hồ trong ngày nên không cần lưu thêm trạng thái). Người khác bổ sung kệ.
 */
function prepare(state: SimState, worker: Worker, emit: Emit): void {
  if (!state.counters.some((c) => c.operatorId === worker.id)) {
    chooseTask(state, worker, emit);
    return;
  }
  const next = PREP_TASK_IDS.find((id) => !state.prep.done.includes(id));
  if (!next) return;
  const step = state.config.prepMs / (PREP_TASK_IDS.length + 1);
  if (dayElapsed(state) < step * (state.prep.done.length + 1)) return;
  applyCommand(
    state,
    { type: "completePrep", taskId: next, workerId: worker.id },
    emit,
  );
}

function progressTask(state: SimState, worker: Worker, emit: Emit): void {
  const task = worker.task!;
  task.timerMs = Math.max(0, task.timerMs - state.config.tickMs);
  if (task.timerMs > 0) return;
  worker.task = null;
  if (task.kind === "restock")
    applyCommand(
      state,
      { type: "restock", productId: task.productId, workerId: worker.id },
      emit,
    );
  else if (task.kind === "pack")
    applyCommand(
      state,
      {
        type: "packDelivery",
        deliveryId: task.deliveryId,
        workerId: worker.id,
        productId: task.productId,
      },
      emit,
    );
  else if (task.kind === "label")
    applyCommand(
      state,
      {
        type: "sendDelivery",
        deliveryId: task.deliveryId,
        workerId: worker.id,
      },
      emit,
    );
}

/** Người cẩn thận hoặc chậm hiểu nghĩ lâu hơn. */
function thinkMs(state: SimState, worker: Worker): number {
  const slow =
    (hasTrait(worker, "meticulous") ? 1.3 : 1) *
    (hasTrait(worker, "slow-learner") ? 1.3 : 1);
  return Math.round(
    (state.config.aiThinkMs * (2 - worker.knowledge) * slow) /
      effectiveSpeed(worker, state.config.owedWageSpeedFactor),
  );
}

function handleOrder(state: SimState, worker: Worker, emit: Emit): void {
  const order = state.orders[worker.orderId!];
  if (!order) {
    worker.orderId = null;
    return;
  }
  if (order.state === "ready") {
    applyCommand(
      state,
      { type: "checkout", workerId: worker.id, orderId: order.id },
      emit,
    );
    return;
  }
  if (order.state !== "deciding") return;
  if (worker.thinkUntilMs === 0) {
    worker.thinkUntilMs = state.timeMs + thinkMs(state, worker);
    return;
  }
  if (state.timeMs < worker.thinkUntilMs) return;
  worker.thinkUntilMs = 0;
  decide(state, worker, order, emit);
}

function decide(
  state: SimState,
  worker: Worker,
  order: Order,
  emit: Emit,
): void {
  const rng = state.rng.ai;
  const request = REQUESTS[order.requestId];
  if (!request) return;

  if (request.kind === "refer") {
    // Đã bị hệ thống chặn một lần thì chắc chắn chuyển sang khuyên đi khám.
    const recognized =
      order.facts.includes("safety-warning") ||
      nextFloat(rng) < effectiveKnowledge(worker);
    if (recognized) {
      applyCommand(
        state,
        { type: "refer", workerId: worker.id, orderId: order.id },
        emit,
      );
    } else {
      const available = unlockedProducts(state);
      const guess = available[nextInt(rng, 0, available.length - 1)]!;
      applyCommand(
        state,
        {
          type: "pickProduct",
          workerId: worker.id,
          orderId: order.id,
          productId: guess,
        },
        emit,
      );
    }
    return;
  }

  const untried = unlockedProducts(state).filter(
    (id) => !order.rejectedProductIds.includes(id),
  );
  const correct = request.acceptable.find(
    (id) => !order.rejectedProductIds.includes(id),
  );
  const knows =
    request.kind === "named" || nextFloat(rng) < effectiveKnowledge(worker);
  const wrongOptions = untried.filter((id) => !request.acceptable.includes(id));
  let choice: ProductId | undefined =
    knows || !wrongOptions.length
      ? correct
      : wrongOptions[nextInt(rng, 0, wrongOptions.length - 1)];
  choice ??= untried[0];
  if (!choice) return;

  if (state.stock[choice].shelf <= 0) {
    // Hết hàng trên kệ: gọi nhập ngay (vẫn qua lệnh restock); không đủ xu thì báo khách tạm hết hàng,
    // khách chọn chờ đơn ship hoặc đi chỗ khác thay vì đứng đợi tới lúc bỏ về.
    applyCommand(
      state,
      { type: "restock", productId: choice, workerId: worker.id },
      emit,
    );
    if (state.stock[choice].shelf <= 0) {
      applyCommand(
        state,
        { type: "deferOrder", workerId: worker.id, orderId: order.id },
        emit,
      );
      return;
    }
  }
  applyCommand(
    state,
    {
      type: "pickProduct",
      workerId: worker.id,
      orderId: order.id,
      productId: choice,
    },
    emit,
  );
}

type Candidate = { score: number; run: () => void };
type Behavior = (state: SimState, worker: Worker, emit: Emit) => Candidate[];

/**
 * Việc mỗi vị trí có thể làm khi rảnh (chấm điểm, chọn việc điểm cao nhất).
 * Thêm vị trí mới (content/stations.ts): thêm một hàm ở đây, mọi hành động vẫn đi qua Command.
 */
const STATION_BEHAVIOR: Record<StationId, Behavior> = {
  // Đứng quầy: phục vụ khách là ưu tiên, rảnh thì bổ sung kệ gần hết và gói đơn ship như người hỗ trợ.
  counter: (state, worker, emit) => [
    ...serveOptions(state, worker, emit),
    ...restockOptions(state, worker, emit, "shared"),
    ...deliveryOptions(state, worker),
  ],
  support: (state, worker, emit) => [
    ...restockOptions(state, worker, emit, "shared"),
    ...deliveryOptions(state, worker),
  ],
  // Kho: bổ sung kệ sớm và nhanh hơn, không phải chờ người khác nhập xong; rảnh tay thì gói đơn.
  stock: (state, worker, emit) => [
    ...restockOptions(state, worker, emit, "dedicated"),
    ...deliveryOptions(state, worker),
  ],
};

function chooseTask(state: SimState, worker: Worker, emit: Emit): void {
  const options = STATION_BEHAVIOR[stationOf(state, worker)](
    state,
    worker,
    emit,
  );

  // "Siêu lười": có việc cần làm thì 25% lần lướt điện thoại vài giây trước đã.
  if (
    options.length > 0 &&
    hasTrait(worker, "lazy") &&
    nextFloat(state.rng.ai) < 0.25
  ) {
    worker.task = { kind: "slack", timerMs: SLACK_MS, timerTotalMs: SLACK_MS };
    return;
  }

  let best: Candidate | undefined;
  for (const option of options)
    if (!best || option.score > best.score) best = option;
  best?.run();
}

function serveOptions(
  state: SimState,
  worker: Worker,
  emit: Emit,
): Candidate[] {
  const options: Candidate[] = [];
  for (const counter of state.counters) {
    if (counter.operatorId !== worker.id || !counter.customerId) continue;
    const customer = state.customers[counter.customerId];
    if (!customer || customer.orderId) continue;
    const urgency = 1 - customer.patienceMs / customer.patienceMaxMs;
    options.push({
      score: 1 + urgency,
      run: () =>
        applyCommand(
          state,
          {
            type: "startService",
            workerId: worker.id,
            customerId: customer.id,
          },
          emit,
        ),
    });
  }
  return options;
}

/**
 * Bổ sung kệ. 'shared': chỉ khi kệ gần hết và mỗi lúc chỉ một người (ngoài kho) đi nhập.
 * 'dedicated' (người ở kho): nhập từ sớm, nhanh hơn, chỉ tránh món người khác đang nhập.
 * Luôn giữ lại ít nhất đủ tiền 2 món để không cạn vốn.
 */
function restockOptions(
  state: SimState,
  worker: Worker,
  emit: Emit,
  mode: "shared" | "dedicated",
): Candidate[] {
  const workers = Object.values(state.workers);
  if (
    mode === "shared" &&
    workers.some(
      (w) => w.task?.kind === "restock" && stationOf(state, w) !== "stock",
    )
  )
    return [];
  const busy = new Set(
    workers.map((w) => (w.task?.kind === "restock" ? w.task.productId : null)),
  );
  const threshold =
    mode === "dedicated"
      ? state.config.stockStationThreshold
      : state.config.aiRestockThreshold;
  const options: Candidate[] = [];
  // Chỉ nhập món đã mở khoá; giá nhập theo xu hướng (progression.ts).
  for (const id of PRODUCT_IDS.filter((productId) =>
    isProductUnlocked(state, productId),
  )) {
    const entry = state.stock[id];
    const ratio = entry.shelf / entry.capacity;
    if (
      ratio > threshold ||
      busy.has(id) ||
      state.money < stockUnitCost(state, id) * 2
    )
      continue;
    options.push({
      score: (mode === "dedicated" ? 0.5 : 0.3) + (1 - ratio) * 0.6,
      run: () => {
        const hardworking = hasTrait(worker, "hardworking") ? 0.7 : 1;
        const dedicated =
          mode === "dedicated" ? state.config.stockStationTimeFactor : 1;
        const total = Math.round(
          (state.config.aiRestockMs * hardworking * dedicated) /
            effectiveSpeed(worker, state.config.owedWageSpeedFactor),
        );
        worker.task = {
          kind: "restock",
          productId: id,
          timerMs: total,
          timerTotalMs: total,
        };
        emit({ type: "restockStarted", productId: id, workerId: worker.id });
      },
    });
  }
  return options;
}

/**
 * Đơn ship: gói từng món (mỗi món một người, không gói trùng món người khác đang lấy), đủ món thì
 * ghi phiếu và gửi. Đơn càng sát hạn càng được ưu tiên; kệ hết món cần gói thì để việc nhập hàng lo.
 */
function deliveryOptions(state: SimState, worker: Worker): Candidate[] {
  const tasks = Object.values(state.workers).map((w) => w.task);
  const packing = (deliveryId: string | null, productId: ProductId) =>
    tasks.filter(
      (t) =>
        t?.kind === "pack" &&
        t.productId === productId &&
        (deliveryId === null || t.deliveryId === deliveryId),
    ).length;
  const options: Candidate[] = [];
  const time = (ms: number) =>
    Math.round(ms / effectiveSpeed(worker, state.config.owedWageSpeedFactor));
  for (const delivery of state.deliveries) {
    if (!isOpenDelivery(delivery)) continue;
    const urgency = Math.max(
      0,
      Math.min(1, 1 - (delivery.dueAtMs - state.timeMs) / state.config.dayMs),
    );
    if (delivery.status === "packed") {
      if (
        tasks.some((t) => t?.kind === "label" && t.deliveryId === delivery.id)
      )
        continue;
      options.push({
        score: 0.7 + urgency * 0.2,
        run: () => {
          const total = time(state.config.deliveryLabelMs);
          worker.task = {
            kind: "label",
            deliveryId: delivery.id,
            timerMs: total,
            timerTotalMs: total,
          };
        },
      });
      continue;
    }
    for (const item of delivery.items) {
      const missing =
        item.qty - item.packed.length - packing(delivery.id, item.productId);
      if (
        missing <= 0 ||
        state.stock[item.productId].shelf - packing(null, item.productId) <= 0
      )
        continue;
      options.push({
        score: 0.35 + urgency * 0.5,
        run: () => {
          const hardworking = hasTrait(worker, "hardworking") ? 0.8 : 1;
          const total = time(state.config.deliveryPackMs * hardworking);
          worker.task = {
            kind: "pack",
            deliveryId: delivery.id,
            productId: item.productId,
            timerMs: total,
            timerTotalMs: total,
          };
        },
      });
      break;
    }
  }
  return options;
}

const SLACK_MS = 3000;

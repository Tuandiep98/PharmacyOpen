import { applyCommand } from './commands';
import { effectiveSpeed } from './economy';
import { PRODUCT_IDS, PRODUCTS } from './content/products';
import { REQUESTS } from './content/requests';
import type { ProductId } from './content/types';
import type { Emit } from './events';
import { nextFloat, nextInt } from './rng';
import { effectiveKnowledge, hasTrait } from './recruit';
import { dayElapsed, isPresent } from './shift';
import { PREP_TASK_IDS, type Order, type SimState, type Worker } from './types';

/**
 * "Bộ não" của nhân viên NPC. Không có đường tắt nào: mọi hành động đều gửi đúng các Command
 * mà người chơi dùng, nên cùng bị kiểm tra kho, giá và luật an toàn.
 *
 * FSM một lượt phục vụ: Idle → (startService) Deciding[suy nghĩ] → pickProduct/refer
 *   → Retrieving → Ready → (checkout) → Complete; đưa nhầm → quay lại Deciding.
 * Khi rảnh, chọn việc có điểm cao nhất (utility): phục vụ khách ở quầy được giao > bổ sung kệ.
 */
export function aiTick(state: SimState, emit: Emit): void {
  for (const worker of Object.values(state.workers)) {
    if (worker.controller !== 'ai') continue;
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
  applyCommand(state, { type: 'completePrep', taskId: next, workerId: worker.id }, emit);
}

function progressTask(state: SimState, worker: Worker, emit: Emit): void {
  const task = worker.task!;
  task.timerMs = Math.max(0, task.timerMs - state.config.tickMs);
  if (task.timerMs > 0) return;
  worker.task = null;
  if (task.kind === 'restock') applyCommand(state, { type: 'restock', productId: task.productId, workerId: worker.id }, emit);
}

/** Người cẩn thận hoặc chậm hiểu nghĩ lâu hơn. */
function thinkMs(state: SimState, worker: Worker): number {
  const slow = (hasTrait(worker, 'meticulous') ? 1.3 : 1) * (hasTrait(worker, 'slow-learner') ? 1.3 : 1);
  return Math.round((state.config.aiThinkMs * (2 - worker.knowledge) * slow) / effectiveSpeed(worker, state.config.owedWageSpeedFactor));
}

function handleOrder(state: SimState, worker: Worker, emit: Emit): void {
  const order = state.orders[worker.orderId!];
  if (!order) {
    worker.orderId = null;
    return;
  }
  if (order.state === 'ready') {
    applyCommand(state, { type: 'checkout', workerId: worker.id, orderId: order.id }, emit);
    return;
  }
  if (order.state !== 'deciding') return;
  if (worker.thinkUntilMs === 0) {
    worker.thinkUntilMs = state.timeMs + thinkMs(state, worker);
    return;
  }
  if (state.timeMs < worker.thinkUntilMs) return;
  worker.thinkUntilMs = 0;
  decide(state, worker, order, emit);
}

function decide(state: SimState, worker: Worker, order: Order, emit: Emit): void {
  const rng = state.rng.ai;
  const request = REQUESTS[order.requestId];
  if (!request) return;

  if (request.kind === 'refer') {
    // Đã bị hệ thống chặn một lần thì chắc chắn chuyển sang khuyên đi khám.
    const recognized = order.facts.includes('safety-warning') || nextFloat(rng) < effectiveKnowledge(worker);
    if (recognized) {
      applyCommand(state, { type: 'refer', workerId: worker.id, orderId: order.id }, emit);
    } else {
      const guess = PRODUCT_IDS[nextInt(rng, 0, PRODUCT_IDS.length - 1)]!;
      applyCommand(state, { type: 'pickProduct', workerId: worker.id, orderId: order.id, productId: guess }, emit);
    }
    return;
  }

  const untried = PRODUCT_IDS.filter((id) => !order.rejectedProductIds.includes(id));
  const correct = request.acceptable.find((id) => !order.rejectedProductIds.includes(id));
  const knows = request.kind === 'named' || nextFloat(rng) < effectiveKnowledge(worker);
  const wrongOptions = untried.filter((id) => !request.acceptable.includes(id));
  let choice: ProductId | undefined = knows || !wrongOptions.length ? correct : wrongOptions[nextInt(rng, 0, wrongOptions.length - 1)];
  choice ??= untried[0];
  if (!choice) return;

  if (state.stock[choice].shelf <= 0) {
    // Hết hàng trên kệ: gọi nhập ngay (vẫn qua lệnh restock); không đủ xu thì đợi rồi thử lại.
    applyCommand(state, { type: 'restock', productId: choice, workerId: worker.id }, emit);
    if (state.stock[choice].shelf <= 0) {
      worker.thinkUntilMs = state.timeMs + thinkMs(state, worker);
      return;
    }
  }
  applyCommand(state, { type: 'pickProduct', workerId: worker.id, orderId: order.id, productId: choice }, emit);
}

type Candidate = { score: number; run: () => void };

function chooseTask(state: SimState, worker: Worker, emit: Emit): void {
  const options: Candidate[] = [];

  for (const counter of state.counters) {
    if (counter.operatorId !== worker.id || !counter.customerId) continue;
    const customer = state.customers[counter.customerId];
    if (!customer || customer.orderId) continue;
    const urgency = 1 - customer.patienceMs / customer.patienceMaxMs;
    options.push({
      score: 1 + urgency,
      run: () => applyCommand(state, { type: 'startService', workerId: worker.id, customerId: customer.id }, emit),
    });
  }

  // Mỗi lúc chỉ một người đi bổ sung kệ, và giữ lại ít nhất đủ tiền 2 món để không cạn vốn.
  const someoneRestocking = Object.values(state.workers).some((w) => w.task?.kind === 'restock');
  if (!someoneRestocking) {
    for (const id of PRODUCT_IDS) {
      const entry = state.stock[id];
      const ratio = entry.shelf / entry.capacity;
      if (ratio > state.config.aiRestockThreshold || state.money < PRODUCTS[id].cost * 2) continue;
      options.push({
        score: 0.3 + (1 - ratio) * 0.6,
        run: () => {
          const hardworking = hasTrait(worker, 'hardworking') ? 0.7 : 1;
          const total = Math.round((state.config.aiRestockMs * hardworking) / effectiveSpeed(worker, state.config.owedWageSpeedFactor));
          worker.task = { kind: 'restock', productId: id, timerMs: total, timerTotalMs: total };
          emit({ type: 'restockStarted', productId: id, workerId: worker.id });
        },
      });
    }
  }

  // "Siêu lười": có việc cần làm thì 25% lần lướt điện thoại vài giây trước đã.
  if (options.length > 0 && hasTrait(worker, 'lazy') && nextFloat(state.rng.ai) < 0.25) {
    worker.task = { kind: 'slack', timerMs: SLACK_MS, timerTotalMs: SLACK_MS };
    return;
  }

  let best: Candidate | undefined;
  for (const option of options) if (!best || option.score > best.score) best = option;
  best?.run();
}

const SLACK_MS = 3000;

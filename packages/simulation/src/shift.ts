import type { Emit } from './events';
import { storeRating } from './reputation';
import { fatigueDelta, hasTrait, QUIT_FATIGUE, refreshRecruits } from './recruit';
import { PLAYER_WORKER_ID } from './state';
import {
  PREP_TASK_IDS,
  type DayPhase,
  type DeepReadonly,
  type PrepTaskId,
  type ShiftId,
  type ShiftSummary,
  type SimState,
  type Worker,
} from './types';

/*
 * Nhịp một ngày ở tiệm: chuẩn bị → mở cửa → ca sáng → giao ca → ca chiều → đóng cửa → chốt sổ.
 * Pha và ca suy ra từ thời gian trong ngày (không có đồng hồ riêng), nên lưu/tải và chạy bù
 * khi vắng mặt vẫn tất định. Người chơi (quản lý) luôn có mặt; NPC chỉ làm việc trong ca của mình.
 */

/** Mốc sao cửa hàng được chúc mừng khi đạt lần đầu (cần đủ số đánh giá để không ăn may). */
export const RATING_MILESTONES = [4, 4.3, 4.6] as const;
const MILESTONE_MIN_REVIEWS = 10;

export function dayElapsed(state: DeepReadonly<SimState>): number {
  return state.timeMs - state.dayStartedAtMs;
}

export function currentShift(state: DeepReadonly<SimState>): ShiftId {
  return dayElapsed(state) < state.config.dayMs / 2 ? 'morning' : 'afternoon';
}

export function dayPhase(state: DeepReadonly<SimState>): DayPhase {
  if (state.prep.openedAtMs === null) return 'prep';
  if (dayElapsed(state) >= state.config.dayMs - state.config.closingMs) return 'closing';
  return 'open';
}

export function isOnDuty(state: DeepReadonly<SimState>, worker: DeepReadonly<Worker>): boolean {
  return worker.controller === 'player' || worker.shifts.includes(currentShift(state));
}

/** Đủ việc chuẩn bị hôm nay thì khách được phục vụ trong tiệm gọn gàng, bớt sốt ruột. */
export function prepComplete(state: DeepReadonly<SimState>): boolean {
  return state.prep.required && PREP_TASK_IDS.every((id) => state.prep.done.includes(id));
}

/** Lương cuối ngày: mỗi ca đã vào làm được trả đúng lương một ca. */
export function shiftPay(wage: number, shiftCount: number): number {
  return wage * shiftCount;
}

/** Chấm công: người có lịch ở ca hiện tại được ghi nhận đã vào ca (một lần mỗi ca). */
export function checkIn(state: SimState, worker: Worker): void {
  const shift = currentShift(state);
  if (!worker.shifts.includes(shift) || worker.shiftsToday.includes(shift)) return;
  worker.shiftsToday.push(shift);
  worker.arrivesAtMs = state.timeMs + (hasTrait(worker, 'late') ? LATE_MS : 0);
}

/** Người "Hay đi trễ" vào ca muộn chừng này. */
export const LATE_MS = 6000;

/** Đang trong ca và đã tới tiệm (người đi trễ chưa tới thì chưa làm việc được). */
export function isPresent(state: DeepReadonly<SimState>, worker: DeepReadonly<Worker>): boolean {
  return isOnDuty(state, worker) && state.timeMs >= worker.arrivesAtMs;
}

/** Có người "Ngăn nắp" đang có mặt thì khách chờ bớt sốt ruột. */
export function tidyOnDuty(state: DeepReadonly<SimState>): boolean {
  return Object.values(state.workers).some((w) => hasTrait(w, 'tidy') && isPresent(state, w));
}

/** Hết ca đầu tiên thì đặc điểm ẩn của người đã làm ca đó lộ ra. */
function revealHidden(state: SimState, shift: ShiftId, emit: Emit): void {
  for (const worker of Object.values(state.workers)) {
    if (worker.hiddenTraits.length === 0 || !worker.shiftsToday.includes(shift)) continue;
    const traits = [...worker.hiddenTraits];
    worker.traits.push(...traits);
    worker.hiddenTraits = [];
    emit({ type: 'traitRevealed', workerId: worker.id, traits });
  }
}

/**
 * Cuối ngày (sau khi trả lương): lộ đặc điểm ẩn của ca chiều, cập nhật mệt mỏi. Ai xin nghỉ từ hôm trước
 * mà chưa được giữ chân thì nghỉ hẳn (trả hết lương nợ nếu đủ xu); ai vừa chạm ngưỡng mệt thì xin nghỉ.
 */
export function closeStaffDay(state: SimState, emit: Emit): void {
  revealHidden(state, 'afternoon', emit);
  for (const worker of Object.values(state.workers)) {
    if (worker.controller !== 'ai') continue;
    if (worker.resigning) {
      const paid = Math.min(state.money, worker.wageOwed);
      state.money -= paid;
      state.stats.spentOnWages += paid;
      delete state.workers[worker.id];
      emit({ type: 'staffQuit', workerId: worker.id, name: worker.name });
      continue;
    }
    worker.fatigue = Math.max(0, Math.min(QUIT_FATIGUE, worker.fatigue + fatigueDelta(worker, worker.shiftsToday.length)));
    if (worker.fatigue >= QUIT_FATIGUE) {
      worker.resigning = true;
      emit({ type: 'resignationRequested', workerId: worker.id });
    }
  }
}

export function markPrepDone(state: SimState, taskId: PrepTaskId, workerId: string, emit: Emit): void {
  state.prep.done.push(taskId);
  emit({ type: 'prepTaskDone', taskId, workerId });
}

export function openStore(state: SimState, auto: boolean, emit: Emit): void {
  state.prep.openedAtMs = state.timeMs;
  emit({ type: 'storeOpened', auto, prepDone: state.prep.done.length });
}

/** Sổ sách của ca hiện tại tính tới lúc này. */
export function shiftSummary(state: DeepReadonly<SimState>): ShiftSummary {
  const start = state.shiftMark.stats;
  const now = state.stats;
  const shift = state.shiftMark.shift;
  return {
    shift,
    revenue: now.revenue - start.revenue,
    customers: now.customersArrived - start.customersArrived,
    sales: now.sales - start.sales,
    referrals: now.referrals - start.referrals,
    lost: now.leftAngry - start.leftAngry + (now.turnedAway - start.turnedAway),
    staff: Object.values(state.workers)
      .filter((w) => w.shiftsToday.includes(shift))
      .map((w) => w.name),
  };
}

/**
 * Quầy đang giao cho người đã hết ca thì bàn giao: ưu tiên NPC đang trong ca và chưa đứng quầy nào,
 * không có ai thì người chơi nhận lại. Đơn dở dang vẫn do người cũ hoàn tất.
 */
export function handOverCounters(state: SimState, emit: Emit, shiftStart = false): void {
  for (const counter of state.counters) {
    const operator = state.workers[counter.operatorId];
    // Đầu ca: quầy người chơi đang giữ được giao cho NPC trong ca (người chơi lấy lại được bất cứ lúc nào).
    const handBack = shiftStart && operator?.controller === 'player';
    if (operator && isOnDuty(state, operator) && !handBack) continue;
    const next =
      Object.values(state.workers).find(
        (w) => w.controller === 'ai' && isOnDuty(state, w) && !state.counters.some((c) => c.operatorId === w.id),
      )?.id ?? PLAYER_WORKER_ID;
    if (next === counter.operatorId) continue;
    counter.operatorId = next;
    emit({ type: 'counterAssigned', counterId: counter.id, workerId: next });
  }
}

/** Bắt đầu một ca mới trong ngày: chốt ca trước, chấm công ca mới, bàn giao quầy. */
function changeShift(state: SimState, shift: ShiftId, emit: Emit): void {
  const summary = shiftSummary(state);
  state.shiftSummaries.push(summary);
  revealHidden(state, state.shiftMark.shift, emit);
  state.shiftMark = { shift, stats: { ...state.stats } };
  for (const worker of Object.values(state.workers)) checkIn(state, worker);
  handOverCounters(state, emit, true);
  emit({ type: 'shiftChanged', shift, previous: summary });
}

/** Bắt đầu ngày mới (gọi sau khi chốt sổ): quay về pha chuẩn bị, chấm công ca sáng. */
export function startDay(state: SimState, emit: Emit): void {
  state.prep = { required: true, openedAtMs: null, done: [] };
  state.shiftSummaries = [];
  state.shiftMark = { shift: 'morning', stats: { ...state.stats } };
  for (const worker of Object.values(state.workers)) {
    worker.shiftsToday = [];
    checkIn(state, worker);
  }
  handOverCounters(state, emit, true);
  refreshRecruits(state);
  emit({ type: 'recruitsRefreshed', paid: false });
}

/** Gọi mỗi tick, trước AI: tự mở cửa khi hết giờ chuẩn bị, đổi ca, chúc mừng mốc sao. */
export function shiftTick(state: SimState, emit: Emit): void {
  if (state.prep.openedAtMs === null && dayElapsed(state) >= state.config.prepMs) openStore(state, true, emit);
  const shift = currentShift(state);
  if (shift !== state.shiftMark.shift) changeShift(state, shift, emit);

  if (state.reputation.count >= MILESTONE_MIN_REVIEWS) {
    const rating = storeRating(state);
    for (const stars of RATING_MILESTONES) {
      if (rating >= stars && !state.ratingMilestones.includes(stars)) {
        state.ratingMilestones.push(stars);
        emit({ type: 'ratingMilestone', stars });
      }
    }
  }
}

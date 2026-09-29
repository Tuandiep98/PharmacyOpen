import {
  dayElapsed,
  dayPhase,
  currentShift,
  type DayGoalId,
  type DeepReadonly,
  type PrepTaskId,
  type ShiftId,
  type SimState,
} from '@pharmacy/simulation';
import { BRAND } from '../../brand';

/** Giờ mở và đóng của đồng hồ trong game; một ngày mô phỏng trải đều trên khoảng này. */
const OPEN_HOUR = 7;
const CLOSE_HOUR = 22;

/** Giờ trong game (vd. "08:15") suy ra từ tiến độ ngày; chỉ để hiển thị. */
export function clockLabel(state: DeepReadonly<SimState>): string {
  const ratio = Math.min(1, dayElapsed(state) / state.config.dayMs);
  const minutes = Math.floor(OPEN_HOUR * 60 + ratio * (CLOSE_HOUR - OPEN_HOUR) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const SHIFT_LABEL: Record<ShiftId, string> = { morning: 'Ca sáng', afternoon: 'Ca chiều' };

export function phaseLabel(state: DeepReadonly<SimState>): string {
  const phase = dayPhase(state);
  if (phase === 'prep') return 'Chuẩn bị';
  if (phase === 'closing') return 'Đóng cửa';
  return SHIFT_LABEL[currentShift(state)];
}

export const PREP_TASKS: Record<PrepTaskId, { title: string; detail: string }> = {
  cash: { title: 'Nhận két đầu ca', detail: 'Đếm tiền lẻ để thối cho khách.' },
  climate: { title: 'Ghi nhiệt độ, độ ẩm', detail: 'Khu để hàng phải khô ráo, thoáng mát.' },
  expiry: { title: 'Rà hàng cận hạn', detail: 'Kiểm tra lô sắp hết hạn trong tab Kho.' },
  shelves: { title: 'Bày kệ', detail: 'Kệ vơi thì nhập thêm trước giờ đông khách.' },
};

export const GOAL_LABEL: Record<DayGoalId, string> = {
  profit: 'Lãi theo hoạt động',
  service: 'Phục vụ ≥ 85% khách',
  rating: 'Đánh giá ≥ 4★',
};

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export const signedNumber = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
export const signed = (n: number) => `${signedNumber(n)} ${BRAND.currency}`;

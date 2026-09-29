import { createInitialState } from "./state";
import type { Emit } from "./events";
import type {
  DayReport,
  DeepReadonly,
  OperationsCaseId,
  OperationsChoiceId,
  SimState,
} from "./types";

export interface OperationsChoice {
  id: OperationsChoiceId;
  title: string;
  consequence: string;
  cost: number;
  score: number;
  demandFactor: number;
}

export interface OperationsCase {
  id: OperationsCaseId;
  title: string;
  story: string;
  choices: readonly OperationsChoice[];
}

/** Hư cấu hóa tình huống vận hành; không mô phỏng cách dùng thuốc hoặc kê đơn. */
export const OPERATIONS_CASES: readonly OperationsCase[] = [
  {
    id: "storage",
    title: "Nhiệt kế đang 'diễn sâu'",
    story:
      "Sổ nhiệt độ và máy đo cãi nhau. Đoàn kiểm tra vùng có thể ghé bất ngờ.",
    choices: [
      {
        id: "careful",
        title: "Kiểm tra và hiệu chuẩn",
        consequence: "Tốn 18 xu, hồ sơ chắc chắn hơn · +8 điểm",
        cost: 18,
        score: 8,
        demandFactor: 1,
      },
      {
        id: "practical",
        title: "Tạm ngưng kệ nghi vấn",
        consequence: "Khách thưa hơn hôm nay · +3 điểm",
        cost: 0,
        score: 3,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        title: "Cứ mở bán, tính sau",
        consequence: "Khách đông hơn, rủi ro kiểm tra · −14 điểm",
        cost: 0,
        score: -14,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "supplier",
    title: "Lô hàng giấy tờ đi lạc",
    story:
      "Nhà cung ứng báo xe đã tới nhưng chứng từ chưa theo kịp. Điện thoại kho reo liên tục.",
    choices: [
      {
        id: "careful",
        title: "Đối soát chứng từ",
        consequence: "Tốn 12 xu xử lý · +7 điểm",
        cost: 12,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        title: "Giữ lô, chờ xác minh",
        consequence: "Ít khách hơn hôm nay · +4 điểm",
        cost: 0,
        score: 4,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        title: "Nhận vội cho kịp doanh số",
        consequence: "Khách đông hơn, sai quy trình · −13 điểm",
        cost: 0,
        score: -13,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "staff",
    title: "Lịch ca thành tâm thư",
    story: "Nhân viên đổi ca sát giờ, nhóm chat bắt đầu thả icon bốc khói.",
    choices: [
      {
        id: "careful",
        title: "Thuê người hỗ trợ ca",
        consequence: "Tốn 20 xu · +7 điểm",
        cost: 20,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        title: "Tự gánh ca đông",
        consequence: "Khách chờ lâu hơn · +2 điểm",
        cost: 0,
        score: 2,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        title: "Ép cả đội tăng tốc",
        consequence: "Khách đông nhưng đội bất mãn · −12 điểm",
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "rumour",
    title: "Bài đăng lan nhanh hơn shipper",
    story:
      "Một khách kể chuyện chờ lâu lên nhóm khu phố; bình luận đã thành hội đồng xét xử.",
    choices: [
      {
        id: "careful",
        title: "Gọi khách và xử lý",
        consequence: "Tốn 10 xu chăm sóc · +7 điểm",
        cost: 10,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        title: "Phản hồi công khai",
        consequence: "Khách vẫn dè chừng · +3 điểm",
        cost: 0,
        score: 3,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        title: "Bỏ qua, đẩy khuyến mãi",
        consequence: "Khách đông tạm thời · −12 điểm",
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
];

export function dailyOperationsCase(
  state: DeepReadonly<SimState>,
): OperationsCase | null {
  return state.day < 2
    ? null
    : OPERATIONS_CASES[(state.seed + state.day - 2) % OPERATIONS_CASES.length]!;
}

export type OperationsResult =
  | "ok"
  | "already-chosen"
  | "no-case"
  | "insufficient-funds"
  | "transfer-pending";

export function chooseOperations(
  state: SimState,
  id: OperationsChoiceId,
  emit: Emit,
): OperationsResult {
  if (state.operations.pendingTransfer) return "transfer-pending";
  const incident = dailyOperationsCase(state);
  if (!incident) return "no-case";
  if (state.operations.choice) return "already-chosen";
  const choice = incident.choices.find((item) => item.id === id);
  if (!choice) return "no-case";
  if (state.money < choice.cost) return "insufficient-funds";
  state.money -= choice.cost;
  state.stats.spentOnOperations =
    (Number.isFinite(state.stats.spentOnOperations)
      ? state.stats.spentOnOperations
      : 0) + choice.cost;
  state.operations.choice = id;
  state.operations.demandFactor = choice.demandFactor;
  state.operations.score = Math.max(
    0,
    Math.min(100, state.operations.score + choice.score),
  );
  emit({
    type: "operationsChosen",
    incident: incident.id,
    choice: id,
    score: state.operations.score,
  });
  return "ok";
}

/** Cuối ngày đánh giá số liệu thực tế, ngoài lựa chọn của người chơi. */
export function evaluateOperations(
  state: SimState,
  report: DayReport,
  emit: Emit,
): void {
  const incident = dailyOperationsCase(state);
  if (incident && !state.operations.choice)
    state.operations.score = Math.max(0, state.operations.score - 5);
  const delta =
    (report.grade === 3
      ? 5
      : report.grade === 2
        ? 1
        : report.grade === 1
          ? -4
          : -8) -
    (report.wagesOwed > 0 ? 8 : 0) -
    (report.prepDone !== null && report.prepDone < 4 ? 3 : 0) -
    Math.min(4, report.expiredStock) -
    Math.min(4, report.lateDeliveries + report.cancelledDeliveries);
  state.operations.score = Math.max(
    0,
    Math.min(100, state.operations.score + delta),
  );
  report.operationsScore = state.operations.score;
  report.operationsChange =
    state.operations.score - state.operations.scoreAtDayStart;
  report.incident = incident?.id ?? null;
  report.incidentChoice = state.operations.choice;
  if (
    (state.day >= 10 && state.operations.score <= 15) ||
    report.wagesOwed >= 100
  ) {
    state.operations.pendingTransfer = true;
    emit({
      type: "transferOrdered",
      score: state.operations.score,
      wagesOwed: report.wagesOwed,
    });
  }
}

/** Người chơi nhận chi nhánh nhỏ: tiến độ chi nhánh đặt lại, số lần điều chuyển giữ lại. */
export function acceptTransfer(state: SimState, emit: Emit): boolean {
  if (!state.operations.pendingTransfer) return false;
  const count = state.operations.transfers + 1;
  const fresh = createInitialState(state.seed + count * 7919, state.config);
  fresh.operations.transfers = count;
  Object.assign(state, fresh);
  emit({ type: "transferAccepted", transfers: count });
  return true;
}

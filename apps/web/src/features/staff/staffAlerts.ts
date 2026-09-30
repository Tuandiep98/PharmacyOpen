import {
  QUIT_FATIGUE,
  type DeepReadonly,
  type SimState,
  type Worker,
} from "@pharmacy/simulation";

/** Từ mức mệt này trở lên thì cảnh báo nên cho nghỉ phép (đỉnh QUIT_FATIGUE là xin thôi việc). */
export const TIRED_RATIO = 0.7;

export interface StaffAlert {
  worker: DeepReadonly<Worker>;
  /** resigning: đang xin thôi việc (khẩn); tired: mệt nặng hoặc làm liền quá lâu (nên cho nghỉ phép). */
  kind: "resigning" | "tired";
  text: string;
}

/**
 * Nhân viên cần chú ý: xin thôi việc, hoặc mệt nặng / làm liền quá hạn mà chưa được xếp nghỉ phép.
 * Dùng chung cho badge tab Nhân sự, mục Đội ngũ và khung cảnh báo đầu danh sách.
 */
export function staffAlerts(state: DeepReadonly<SimState>): StaffAlert[] {
  const limit = state.config.streakFatigueDays;
  const alerts: StaffAlert[] = [];
  for (const worker of Object.values(state.workers)) {
    if (worker.controller !== "ai") continue;
    if (worker.resigning) {
      alerts.push({
        worker,
        kind: "resigning",
        text: "Xin thôi việc vì quá sức · quyết trong hôm nay",
      });
      continue;
    }
    const resting =
      worker.restDay === state.day || worker.restDay === state.day + 1;
    if (resting) continue;
    if (worker.fatigue >= QUIT_FATIGUE * TIRED_RATIO)
      alerts.push({
        worker,
        kind: "tired",
        text: `Mệt ${worker.fatigue}/${QUIT_FATIGUE} · nên cho nghỉ phép`,
      });
    else if (worker.streak >= limit)
      alerts.push({
        worker,
        kind: "tired",
        text: `Làm ${worker.streak} ngày liền · nên cho nghỉ phép`,
      });
  }
  return alerts.sort(
    (a, b) => Number(a.kind === "tired") - Number(b.kind === "tired"),
  );
}

import type { DeepReadonly, SimState, Worker } from "@pharmacy/simulation";
import { BagIcon, BoxIcon, ClockIcon, WarningIcon } from "../../art/Icons";
import {
  workerActivity,
  workerStatus,
  type WorkerActivity,
} from "./workerStatus";

const ICON: Partial<Record<WorkerActivity, React.ReactNode>> = {
  serving: <BagIcon size={14} />,
  working: <BoxIcon size={14} />,
  waiting: <ClockIcon size={14} />,
  slack: <WarningIcon size={14} />,
};

/** Huy hiệu "đang làm gì": icon + chữ + màu theo nhóm, dùng chung cho khay, thẻ quầy, thẻ và dialog nhân viên. */
export function ActivityBadge({
  state,
  worker,
  suffix,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
  suffix?: string;
}) {
  const kind = workerActivity(state, worker);
  return (
    <span className="activity-badge" data-kind={kind}>
      <span className="activity-icon" aria-hidden>
        {ICON[kind] ?? <span className="activity-dot" />}
      </span>
      <span className="activity-text">
        {workerStatus(state, worker)}
        {suffix}
      </span>
    </span>
  );
}

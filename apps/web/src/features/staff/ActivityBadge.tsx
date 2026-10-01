import type { DeepReadonly, SimState, Worker } from "@pharmacy/simulation";
import {
  BoxIcon,
  CheckIcon,
  ChatIcon,
  ClockIcon,
  CoinIcon,
  WarningIcon,
} from "../../art/Icons";
import {
  workerActivity,
  workerStatus,
  type WorkerActivity,
} from "./workerStatus";

function activityIcon(
  state: DeepReadonly<SimState>,
  worker: DeepReadonly<Worker>,
  kind: WorkerActivity,
) {
  if (kind === "working") return <BoxIcon size={14} />;
  if (kind === "waiting") return <ClockIcon size={14} />;
  if (kind === "slack") return <WarningIcon size={14} />;
  if (kind !== "serving") return <ClockIcon size={14} />;

  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (order?.state === "retrieving") return <BoxIcon size={14} />;
  if (order?.state === "checkingOut" || order?.state === "ready") {
    return <CoinIcon size={14} />;
  }
  if (order?.state === "chatting" || order?.state === "deciding") {
    return <ChatIcon size={14} />;
  }
  return <CheckIcon size={14} />;
}

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
        {activityIcon(state, worker, kind)}
      </span>
      <span className="activity-text">
        {workerStatus(state, worker)}
        {suffix}
      </span>
    </span>
  );
}

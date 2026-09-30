import {
  isOnDuty,
  isPresent,
  PLAYER_WORKER_ID,
  type DeepReadonly,
  type SimState,
  type Worker,
} from "@pharmacy/simulation";
import { WorkerPortrait } from "../../art/WorkerFigure";
import { SwapIcon } from "../../art/Icons";
import { useUi } from "../../ui/uiStore";
import { GameButton } from "../../ui/primitives";
import { useServiceActions } from "../store/useServiceActions";
import { workerProgress, workerStatus } from "./workerStatus";
import { ActivityBadge } from "./ActivityBadge";
import { GradeBadge, gradeOf, nameClassOf, StaffAvatar } from "./GradeBadge";
import "./staff.css";

type State = DeepReadonly<SimState>;
type PickState = "current" | "other-counter" | "busy" | "away" | "free";

/** Tên gọi ngắn trên ô chọn: tên riêng (chữ cuối), người chơi là "Tôi". */
export function shortName(worker: DeepReadonly<Worker>): string {
  if (worker.id === PLAYER_WORKER_ID) return "Tôi";
  return worker.name.split(" ").pop() || worker.name;
}

function pickState(
  state: State,
  worker: DeepReadonly<Worker>,
  counterId: string,
): { kind: PickState; label: string } {
  const at = state.counters.findIndex((c) => c.operatorId === worker.id);
  if (at >= 0 && state.counters[at]!.id === counterId)
    return { kind: "current", label: "Đang trực" };
  if (at >= 0) return { kind: "other-counter", label: `Quầy ${at + 1}` };
  if (worker.orderId) return { kind: "busy", label: "Đang bán" };
  if (worker.task?.kind === "restock")
    return { kind: "busy", label: "Bổ sung kệ" };
  if (worker.task?.kind === "pack" || worker.task?.kind === "label")
    return { kind: "busy", label: "Gói đơn ship" };
  if (worker.task?.kind === "slack")
    return { kind: "busy", label: "Lướt điện thoại" };
  if (!isPresent(state, worker)) return { kind: "away", label: "Đang tới" };
  if (worker.controller === "ai" && worker.station === "stock")
    return { kind: "free", label: "Ở kho" };
  return { kind: "free", label: "Rảnh" };
}

/**
 * Ô vuông chọn người đứng một quầy: chân dung, cấp, tên ngắn và việc đang làm. Chạm là giao quầy
 * (cùng lệnh assignCounter như mọi nơi khác); người đang đứng quầy này hiện trạng thái "Đang trực".
 * Chỉ liệt kê người trong ca; người ngoài ca được đếm ở dòng cuối.
 */
export function CounterStaffPicker({
  state,
  counterId,
  includePlayer = true,
}: {
  state: State;
  counterId: string;
  includePlayer?: boolean;
}) {
  const { assignCounter } = useServiceActions();
  const setTab = useUi((s) => s.setTab);
  const staff = Object.values(state.workers).filter(
    (w) => w.controller === "ai",
  );
  const onDuty = staff.filter((w) => isOnDuty(state, w));
  const player = state.workers[PLAYER_WORKER_ID];
  const order: Record<PickState, number> = {
    current: 0,
    free: 1,
    away: 2,
    busy: 3,
    "other-counter": 4,
  };
  const people = [
    ...(includePlayer && player ? [player] : []),
    ...onDuty.sort(
      (a, b) =>
        order[pickState(state, a, counterId).kind] -
        order[pickState(state, b, counterId).kind],
    ),
  ];
  const offDuty = staff.length - onDuty.length;
  const index = state.counters.findIndex((c) => c.id === counterId);
  const counterName = state.counters.length > 1 ? `quầy ${index + 1}` : "quầy";

  return (
    <div className="staff-picker">
      {people.length > 0 && (
        <ul className="pick-grid" aria-label={`Chọn người đứng ${counterName}`}>
          {people.map((w) => {
            const { kind, label } = pickState(state, w, counterId);
            const progress = kind === "busy" ? workerProgress(state, w) : null;
            return (
              <li key={w.id}>
                <GameButton
                  surface="custom"
                  type="button"
                  className={`pick-tile pick-${kind} ${w.controller === "ai" ? `grade-${gradeOf(w)?.grade ?? "C"}-edge` : ""}`}
                  aria-pressed={kind === "current"}
                  aria-label={`${kind === "current" ? "" : "Giao "}${counterName} cho ${w.id === PLAYER_WORKER_ID ? "bạn" : w.name}${w.controller === "ai" ? `, cấp ${w.level}` : ""}. ${workerStatus(state, w)}`}
                  title={workerStatus(state, w)}
                  onClick={() =>
                    kind !== "current" && assignCounter(w.id, counterId)
                  }
                >
                  <span className="pick-portrait">
                    <WorkerPortrait worker={w} size={40} />
                    {w.controller === "ai" && (
                      <span className="pick-level">
                        <GradeBadge subject={w} size="sm" static />
                        Cấp {w.level}
                      </span>
                    )}
                  </span>
                  <strong className={`pick-name ${nameClassOf(w)}`}>
                    {shortName(w)}
                  </strong>
                  <span className="pick-status">
                    {kind === "current" && <span aria-hidden>✓ </span>}
                    {label}
                  </span>
                  {progress !== null && (
                    <span className="pick-progress" aria-hidden>
                      <span style={{ width: `${progress * 100}%` }} />
                    </span>
                  )}
                </GameButton>
              </li>
            );
          })}
        </ul>
      )}
      {staff.length === 0 ? (
        <p className="pick-note">
          Chưa có nhân viên.{" "}
          <GameButton
            tone="quiet"
            surface="flat"
            size="small"
            type="button"
            className="link-btn"
            onClick={() => setTab("staff")}
          >
            Tuyển ở tab Nhân sự
          </GameButton>
        </p>
      ) : (
        offDuty > 0 && (
          <p className="pick-note">
            {offDuty} người ngoài ca hoặc nghỉ hôm nay.
          </p>
        )
      )}
    </div>
  );
}

/**
 * Chân dung người đang đứng quầy kèm nút tròn nhỏ "đổi người" đè ở góc. Cả chân dung là vùng chạm
 * (≥ 44 px); chạm mở/đóng bộ chọn người ngay bên dưới.
 */
export function SwapAvatar({
  worker,
  size = 40,
  open,
  onToggle,
  counterLabel,
}: {
  worker: DeepReadonly<Worker>;
  size?: number;
  open: boolean;
  onToggle: () => void;
  counterLabel: string;
}) {
  return (
    <GameButton
      surface="custom"
      type="button"
      className={`swap-avatar ${open ? "open" : ""}`}
      style={{ width: Math.max(44, size), height: Math.max(44, size) }}
      aria-expanded={open}
      aria-label={`Đổi người đứng ${counterLabel} (đang là ${worker.id === PLAYER_WORKER_ID ? "bạn" : worker.name})`}
      onClick={onToggle}
    >
      <WorkerPortrait worker={worker} size={size} />
      <span className="swap-grade">
        <GradeBadge subject={worker} size="sm" static />
      </span>
      <span className="swap-badge" aria-hidden>
        <SwapIcon size={14} />
      </span>
    </GameButton>
  );
}

/** Thẻ một quầy: ai đang đứng, đang làm gì, và bộ chọn người. Dùng ở tab Nhân sự và khi chạm quầy trong cảnh. */
export function CounterCard({
  state,
  counterId,
}: {
  state: State;
  counterId: string;
}) {
  const index = state.counters.findIndex((c) => c.id === counterId);
  const counter = state.counters[index];
  if (!counter) return null;
  const operator = counter.operatorId
    ? state.workers[counter.operatorId]
    : undefined;
  const progress = operator ? workerProgress(state, operator) : null;
  return (
    <section
      className="counter-summary"
      aria-label={`Trạng thái quầy ${index + 1}`}
    >
      <div className="counter-summary-head">
        <span className="counter-summary-label">Quầy {index + 1}</span>
        <span className="small muted">
          {counter.customerId
            ? "Đang có khách"
            : !operator
              ? "Chưa có người đứng"
              : `${state.queue.length} khách đang chờ`}
        </span>
      </div>
      <div className="counter-summary-main">
        {operator && <StaffAvatar worker={operator} size={48} />}
        <div className="counter-summary-text">
          <strong className={operator ? nameClassOf(operator) : ""}>
            {operator ? operator.name : "Quầy chưa mở"}
          </strong>
          {operator ? (
            <ActivityBadge state={state} worker={operator} />
          ) : (
            <span>Chọn người đứng quầy bên dưới.</span>
          )}
        </div>
      </div>
      {operator && (
        <span
          className="progress-track"
          role="progressbar"
          aria-label={`Tiến độ công việc của ${operator.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((progress ?? 0) * 100)}
          data-idle={progress === null || undefined}
        >
          <span
            className="progress-fill"
            style={{ width: `${(progress ?? 0) * 100}%` }}
          />
        </span>
      )}
      <CounterStaffPicker state={state} counterId={counter.id} />
    </section>
  );
}

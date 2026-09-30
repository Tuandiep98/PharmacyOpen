import {
  dayElapsed,
  dayPhase,
  PREP_TASK_IDS,
  PRODUCT_IDS,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { CheckIcon, ClockIcon } from "../../art/Icons";
import { useBridge } from "../../game/useGame";
import { GameButton } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { nameClassOf } from "../staff/GradeBadge";
import { REJECT_TEXT } from "../store/rejectText";
import { PLAYER_WORKER_ID } from "../store/useServiceActions";
import { PREP_TASKS } from "./dayText";
import "./day.css";

/**
 * Dải trạng thái lúc đóng cửa (nằm cùng vùng thông báo với toast, phía trên cảnh): tiêu đề ngắn + một
 * dòng giải thích để màn hẹp xuống dòng gọn gàng.
 */
export function DayBanner({ state }: { state: DeepReadonly<SimState> }) {
  if (dayPhase(state) !== "closing") return null;
  // Hết giờ mà còn khách: tiệm tăng ca, chỉ chốt sổ khi đã phục vụ xong.
  const remaining = Object.values(state.customers).filter(
    (c) => c.phase !== "leaving",
  ).length;
  const overtime = dayElapsed(state) >= state.config.dayMs && remaining > 0;
  return (
    <div className="toast-card day-banner warn" role="status">
      <span className="toast-card-icon" aria-hidden>
        <ClockIcon size={18} />
      </span>
      <span className="toast-card-text">
        <strong>{overtime ? `Tăng ca · còn ${remaining} khách` : "Đã đóng cửa"}</strong>
        <span>
          {overtime
            ? "Chốt sổ khi phục vụ xong."
            : "Phục vụ nốt khách đang chờ rồi chốt sổ."}
        </span>
      </span>
    </div>
  );
}

/**
 * Pha chuẩn bị: danh sách việc mở ca và nút "Mở cửa". Hết giờ chuẩn bị thì tiệm tự mở,
 * việc chưa làm được ghi vào tổng kết ngày.
 */
export function OpeningPanel({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const setTab = useUi((s) => s.setTab);
  const phase = dayPhase(state);

  if (phase !== "prep") return null;

  const secondsLeft = Math.max(
    0,
    Math.ceil((state.config.prepMs - dayElapsed(state)) / 1000),
  );
  const operator =
    state.workers[
      state.counters.find(
        (c) => c.operatorId && state.workers[c.operatorId]?.controller === "ai",
      )?.operatorId ?? ""
    ];
  const npcPrepares = operator?.controller === "ai";
  const lowShelves = PRODUCT_IDS.filter(
    (id) => state.stock[id].shelf <= state.stock[id].capacity / 3,
  ).length;

  const run = (command: Parameters<typeof bridge.dispatch>[0]) => {
    const r = bridge.dispatch(command);
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
  };

  return (
    <section className="opening-panel" aria-label="Chuẩn bị mở cửa">
      <header>
        <strong>Chuẩn bị mở cửa · Ngày {state.day}</strong>
        <span className="small muted">Tự mở sau {secondsLeft} giây</span>
      </header>
      {npcPrepares && (
        <p className="small muted">
          {operator && (
            <span className={nameClassOf(operator)}>{operator.name}</span>
          )}{" "}
          đang đứng quầy và sẽ lần lượt làm các việc này.
        </p>
      )}
      <ul className="prep-list">
        {PREP_TASK_IDS.map((id) => {
          const done = state.prep.done.includes(id);
          const detail =
            id === "shelves" && lowShelves > 0
              ? `${lowShelves} món đang vơi kệ.`
              : PREP_TASKS[id].detail;
          return (
            <li key={id} className={done ? "done" : ""}>
              <GameButton
                surface="inset"
                className="prep-item"
                disabled={done}
                aria-pressed={done}
                onClick={() => {
                  run({
                    type: "completePrep",
                    taskId: id,
                    workerId: PLAYER_WORKER_ID,
                  });
                  if (id === "expiry" || id === "shelves") setTab("inventory");
                }}
              >
                <span className="prep-check" aria-hidden>
                  {done && <CheckIcon size={16} />}
                </span>
                <span className="prep-text">
                  <b>{PREP_TASKS[id].title}</b>
                  <span className="small muted">{detail}</span>
                </span>
              </GameButton>
            </li>
          );
        })}
      </ul>
      <p className="small muted">
        Làm đủ {PREP_TASK_IDS.length} việc thì khách hôm nay bớt sốt ruột hơn
        một chút.
      </p>
      <GameButton tone="primary" onClick={() => run({ type: "openStore" })}>
        Mở cửa ({state.prep.done.length}/{PREP_TASK_IDS.length})
      </GameButton>
    </section>
  );
}

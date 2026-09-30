import type { DeepReadonly, SimState } from "@pharmacy/simulation";
import { DismissButton } from "./DismissButton";
import { StaffAvatar } from "./GradeBadge";
import { useServiceActions } from "../store/useServiceActions";
import {
  LevelBar,
  ReviewTraits,
  StatBars,
  TraitTags,
  WageLine,
} from "./StaffPanel";
import { ActivityBadge } from "./ActivityBadge";
import { GameButton } from "../../ui/primitives";

export function WorkerSheet({
  state,
  workerId,
  onClose,
}: {
  state: DeepReadonly<SimState>;
  workerId: string;
  onClose: () => void;
}) {
  const { assignCounter } = useServiceActions();
  const worker = state.workers[workerId];
  if (!worker) return null;
  const operates = state.counters.some((c) => c.operatorId === worker.id);
  return (
    <article className="detail-layout worker-detail">
      <header className="detail-hero">
        <div className="detail-portrait worker-portrait">
          <StaffAvatar worker={worker} size={84} badge="lg" />
        </div>
        <span className="detail-eyebrow">
          {worker.role === "pharmacist" ? "Dược sĩ" : "Nhân viên"} ·{" "}
          {worker.controller === "player" ? "Bạn điều khiển" : "Tự làm việc"}
        </span>
        <h1>{worker.name}</h1>
        <span className="detail-status">
          <ActivityBadge state={state} worker={worker} />
        </span>
      </header>
      <div className="detail-scroll">
        <section className="detail-overview" aria-label="Thành tích nhân viên">
          <div className="detail-stat">
            <span>Đã phục vụ</span>
            <strong>{worker.served}</strong>
            <small>khách</small>
          </div>
          <div className="detail-stat">
            <span>Nghiệp vụ</span>
            <strong>
              {worker.perfCount
                ? Math.round(worker.perfSum / worker.perfCount)
                : "—"}
            </strong>
            <small>/100 điểm</small>
          </div>
          <div className="detail-stat">
            <span>Khách chấm</span>
            <strong>
              {worker.repCount
                ? (worker.repStarsSum / worker.repCount).toLocaleString(
                    "vi-VN",
                    { maximumFractionDigits: 1 },
                  )
                : "—"}
            </strong>
            <small>
              {worker.repCount ? `★ · ${worker.repCount} lượt` : "chưa có"}
            </small>
          </div>
        </section>
        <section className="detail-section">
          <h2>Đặc điểm & nhận xét</h2>
          <TraitTags
            traits={worker.traits}
            hidden={worker.hiddenTraits.length}
          />
          <ReviewTraits state={state} worker={worker} />
        </section>
        {worker.controller === "ai" && (
          <section className="detail-section">
            <h2>Tay nghề & lương</h2>
            <LevelBar worker={worker} />
            <StatBars
              speed={worker.speed}
              knowledge={worker.knowledge}
              communication={worker.communication}
            />
            <WageLine worker={worker} />
          </section>
        )}
      </div>
      {(!operates || worker.controller === "ai") && (
        <footer className="detail-footer">
          {!operates &&
            state.counters.map((counter, index) => (
              <GameButton
                key={counter.id}
                tone="primary"
                onClick={() => assignCounter(worker.id, counter.id)}
              >
                {worker.controller === "player"
                  ? "Tự đứng"
                  : `Giao ${worker.name}`}{" "}
                quầy {state.counters.length > 1 ? index + 1 : ""}
              </GameButton>
            ))}
          <DismissButton worker={worker} onDone={onClose} />
        </footer>
      )}
    </article>
  );
}

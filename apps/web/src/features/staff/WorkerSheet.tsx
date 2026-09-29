import type { DeepReadonly, SimState } from "@pharmacy/simulation";
import { useUi } from "../../ui/uiStore";
import { DismissButton } from "./DismissButton";
import { WorkerPortrait } from "../../art/WorkerFigure";
import { useServiceActions } from "../store/useServiceActions";
import {
  LevelBar,
  ReviewTraits,
  StatBars,
  TraitTags,
  WageLine,
  WorkerMetrics,
  workerStatus,
} from "./StaffPanel";
import { GameButton } from "../../ui/primitives";

export function WorkerSheet({
  state,
  workerId,
}: {
  state: DeepReadonly<SimState>;
  workerId: string;
}) {
  const { assignCounter } = useServiceActions();
  const select = useUi((s) => s.select);
  const worker = state.workers[workerId];
  if (!worker) return null;
  const operates = state.counters.some((c) => c.operatorId === worker.id);
  return (
    <div className="stack">
      <div className="service-head">
        <WorkerPortrait worker={worker} size={64} />
        <div className="service-who">
          <strong>
            {worker.controller === "player" ? `${worker.name} · ` : ""}
            {worker.role === "pharmacist" ? "Dược sĩ" : "Nhân viên"}{" "}
            {worker.controller === "player" ? "" : worker.name}{" "}
            <TraitTags
              traits={worker.traits}
              hidden={worker.hiddenTraits.length}
            />
          </strong>
          <span className="muted small">
            {worker.controller === "player"
              ? "Do bạn điều khiển"
              : "Nhân viên tự làm việc"}{" "}
            · đã bán {worker.served}
          </span>
          <span className="small">{workerStatus(state, worker)}</span>
          <WorkerMetrics worker={worker} />
          <ReviewTraits state={state} worker={worker} />
          <WageLine worker={worker} />
          {worker.controller === "ai" && <LevelBar worker={worker} />}
        </div>
      </div>
      {worker.controller === "ai" && (
        <StatBars
          speed={worker.speed}
          knowledge={worker.knowledge}
          communication={worker.communication}
        />
      )}
      {!operates &&
        state.counters.map((counter, index) => (
          <GameButton
            key={counter.id}
            onClick={() => assignCounter(worker.id, counter.id)}
          >
            {worker.controller === "player" ? "Tự đứng" : `Giao ${worker.name}`}{" "}
            quầy {state.counters.length > 1 ? index + 1 : ""}
          </GameButton>
        ))}
      <DismissButton worker={worker} onDone={() => select(null)} />
    </div>
  );
}

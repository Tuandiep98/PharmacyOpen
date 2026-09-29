import {
  PLAYER_WORKER_ID,
  type DeepReadonly,
  type Worker,
} from "@pharmacy/simulation";
import { PharmacistFigure, StaffFigure } from "./Character";

/** Vẽ đúng nhân vật cho một nhân viên: An có hình riêng, NPC dựng từ look + vai trò. */
export function WorkerFigure({ worker }: { worker: DeepReadonly<Worker> }) {
  if (worker.id === PLAYER_WORKER_ID)
    return <PharmacistFigure expression={worker.expression} />;
  return (
    <StaffFigure
      look={worker.look}
      role={worker.role}
      expression={worker.expression}
    />
  );
}

export function WorkerPortrait({
  worker,
  size = 56,
}: {
  worker: DeepReadonly<Worker>;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="-34 -112 68 68" aria-hidden>
      <circle
        cx={0}
        cy={-78}
        r={33}
        fill={worker.role === "pharmacist" ? "#DCEFE3" : "#F8ECD6"}
      />
      <WorkerFigure worker={worker} />
    </svg>
  );
}

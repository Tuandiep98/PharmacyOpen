import {
  itemAt,
  PLAYER_WORKER_ID,
  type DeepReadonly,
  type SimState,
  type Worker,
} from "@pharmacy/simulation";
import { useContext } from "react";
import { GameContext } from "../game/useGame";
import {
  PharmacistFigure,
  StaffFigure,
  type CharacterAction,
} from "./Character";

/** Id món sưu tầm người này đang đeo (nếu có). */
export function wornItemOf(
  state: DeepReadonly<SimState> | undefined,
  workerId: string,
): string | undefined {
  return state ? itemAt(state, `wear:${workerId}`)?.defId : undefined;
}

/** Vẽ đúng nhân vật cho một nhân viên: An có hình riêng, NPC dựng từ look + vai trò. */
export function WorkerFigure({
  worker,
  action = "idle",
  accessory,
}: {
  worker: DeepReadonly<Worker>;
  action?: CharacterAction;
  accessory?: string;
}) {
  if (worker.id === PLAYER_WORKER_ID)
    return (
      <PharmacistFigure
        expression={worker.expression}
        action={action}
        accessory={accessory}
      />
    );
  return (
    <StaffFigure
      look={worker.look}
      role={worker.role}
      expression={worker.expression}
      action={action}
      accessory={accessory}
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
  // Đọc state không đăng ký cập nhật: nơi dùng chân dung đã tự vẽ lại theo nhịp mô phỏng.
  const state = useContext(GameContext)?.state;
  return (
    <svg width={size} height={size} viewBox="-34 -112 68 68" aria-hidden>
      <circle
        cx={0}
        cy={-78}
        r={33}
        fill={worker.role === "pharmacist" ? "#DCEFE3" : "#F8ECD6"}
      />
      <WorkerFigure worker={worker} accessory={wornItemOf(state, worker.id)} />
    </svg>
  );
}

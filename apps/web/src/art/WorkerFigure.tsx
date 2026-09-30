import {
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

/** Danh sách món đeo theo lớp, gồm cả bản lưu cũ. */
export function wornItemOf(
  state: DeepReadonly<SimState> | undefined,
  workerId: string,
): { defId: string; grade: "S" | "A" | "B" | "C"; effects: readonly { stat: string; value: number }[] }[] {
  if (!state) return [];
  return Object.entries(state.collection.equipped)
    .filter(([place]) => place === `wear:${workerId}` || place.startsWith(`wear:${workerId}:`))
    .map(([, uid]) => state.collection.items.find((item) => item.uid === uid))
    .filter((item): item is NonNullable<typeof item> => !!item)
    .map(({ defId, grade, effects }) => ({ defId, grade, effects }));
}

/** Vẽ đúng nhân vật cho một nhân viên: An có hình riêng, NPC dựng từ look + vai trò. */
export function WorkerFigure({
  worker,
  action = "idle",
  accessories,
}: {
  worker: DeepReadonly<Worker>;
  action?: CharacterAction;
  accessories?: ReturnType<typeof wornItemOf>;
}) {
  if (worker.id === PLAYER_WORKER_ID)
    return (
      <PharmacistFigure
        expression={worker.expression}
        action={action}
        accessories={accessories}
      />
    );
  return (
    <StaffFigure
      look={worker.look}
      role={worker.role}
      expression={worker.expression}
      action={action}
      accessories={accessories}
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
      <WorkerFigure worker={worker} accessories={wornItemOf(state, worker.id)} />
    </svg>
  );
}

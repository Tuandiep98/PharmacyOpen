import type { DeepReadonly, Worker } from "@pharmacy/simulation";
import { useState } from "react";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { useUi } from "../../ui/uiStore";
import { GameButton } from "../../ui/primitives";
import { REJECT_TEXT } from "../store/rejectText";

/** Cho nhân viên thôi việc (khác nghỉ phép): chạm hai lần để xác nhận (không dùng hộp thoại trình duyệt). */
export function DismissButton({
  worker,
  onDone,
}: {
  worker: DeepReadonly<Worker>;
  onDone?: () => void;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const [confirming, setConfirming] = useState(false);
  if (worker.controller !== "ai") return null;
  return (
    <GameButton
      size="small"
      tone={confirming ? "danger" : "secondary"}
      onBlur={() => setConfirming(false)}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        const r = bridge.dispatch({
          type: "dismissStaff",
          workerId: worker.id,
        });
        if (r.ok) onDone?.();
        else
          pushToast(
            "bad",
            r.reason === "worker-busy"
              ? `${worker.name} đang phục vụ khách, thử lại khi xong nhé.`
              : REJECT_TEXT[r.reason],
          );
      }}
    >
      {confirming
        ? `Xác nhận cho thôi việc${worker.wageOwed ? ` · trả nợ ${worker.wageOwed} ${BRAND.currency}` : ""}`
        : "Cho thôi việc"}
    </GameButton>
  );
}

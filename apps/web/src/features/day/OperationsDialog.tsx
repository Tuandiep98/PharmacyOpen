import {
  dailyOperationsCase,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { useBridge } from "../../game/useGame";
import { useUi } from "../../ui/uiStore";
import { GameButton } from "../../ui/primitives";
import { REJECT_TEXT } from "../store/rejectText";
import "./day.css";

export function OperationsDialog({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const incident = dailyOperationsCase(state);
  if (!incident || state.operations.choice) return null;
  return (
    <div className="modal-backdrop">
      <div
        className="modal operations-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operations-title"
      >
        <p className="small muted">
          Hồ sơ quản lý vùng · Ngày {state.day} · {state.operations.score}/100
          điểm
        </p>
        <h1 id="operations-title">{incident.title}</h1>
        <p>{incident.story}</p>
        <div className="operations-choices">
          {incident.choices.map((choice) => (
            <button
              className="operations-choice"
              key={choice.id}
              disabled={state.money < choice.cost}
              onClick={() => {
                const result = bridge.dispatch({
                  type: "chooseOperations",
                  choice: choice.id,
                });
                if (!result.ok) pushToast("bad", REJECT_TEXT[result.reason]);
              }}
            >
              <strong>{choice.title}</strong>
              <span>{choice.consequence}</span>
            </button>
          ))}
        </div>
        <p className="small muted">
          Điểm thấp hoặc nợ lương lớn sẽ dẫn tới điều chuyển sang chi nhánh nhỏ.
        </p>
      </div>
    </div>
  );
}

export function TransferDialog({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  if (!state.operations.pendingTransfer) return null;
  return (
    <div className="modal-backdrop">
      <div
        className="modal operations-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
      >
        <p className="small muted">Thông báo từ quản lý vùng</p>
        <h1 id="transfer-title">Điều chuyển công tác</h1>
        <p>
          Hồ sơ vận hành còn {state.operations.score}/100 điểm. Chi nhánh này
          cần người khác tiếp quản. Bạn bắt đầu lại ở một tiệm nhỏ hơn, với kinh
          nghiệm cũ và một câu chuyện mới để kể.
        </p>
        <p className="notice bad">
          Tồn kho, tiền, nhân sự và nâng cấp của chi nhánh hiện tại sẽ đặt lại.
          Số lần điều chuyển được ghi nhớ.
        </p>
        <GameButton
          tone="primary"
          size="large"
          onClick={() => {
            const result = bridge.dispatch({ type: "acceptTransfer" });
            if (!result.ok) pushToast("bad", REJECT_TEXT[result.reason]);
          }}
        >
          Nhận chi nhánh mới
        </GameButton>
      </div>
    </div>
  );
}

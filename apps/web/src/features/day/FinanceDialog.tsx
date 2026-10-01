import type { DeepReadonly, SimState } from "@pharmacy/simulation";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { GameButton } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { REJECT_TEXT } from "../store/rejectText";

export function FinanceDialog({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const notice = state.finance.notice;
  if (!notice) return null;
  const acknowledge = () =>
    bridge.dispatch({ type: "acknowledgeFinanceNotice" });
  const repay = () => {
    const result = bridge.dispatch({ type: "repayLoan" });
    if (!result.ok) pushToast("bad", REJECT_TEXT[result.reason]);
  };

  let title = "Thông báo tài chính";
  let body: React.ReactNode = null;
  if (notice.kind === "emergency-loan") {
    title = "Tiệm không đủ vốn nhập hàng mới";
    body = (
      <>
        Ngân hàng đã giải ngân{" "}
        <b>
          {notice.amount} {BRAND.currency}
        </b>{" "}
        để tiệm tiếp tục duy trì. Khoản vay đến hạn sau 7 ngày; quá hạn tính lãi
        10% mỗi ngày và sau 7 ngày nữa sẽ bị siết nợ.
      </>
    );
  } else if (notice.kind === "lock-blocked") {
    title = "Khoá đã chặn một vụ cạy cửa";
    body = notice.broken
      ? "Khoá đã mòn hết và hỏng. Hãy mua khoá mới trước khi kẻ trộm quay lại."
      : `Khoá còn ${notice.durability}/3 độ bền. Hàng và tiền trong két vẫn an toàn.`;
  } else if (notice.kind === "burglary") {
    title = "Tiệm bị cạy cửa lúc nửa đêm";
    body = `Két mất ${notice.cashLost} ${BRAND.currency}; ${notice.stockLost > 0 ? `${notice.stockLost} món trên kệ cũng thất lạc.` : "hàng hoá may mắn vẫn còn nguyên."}`;
  } else if (notice.kind === "loan-due") {
    title = "Khoản vay đã quá hạn";
    body = `Dư nợ hiện là ${notice.balance} ${BRAND.currency}. Còn ${notice.daysLeft} ngày trước khi ngân hàng siết nợ.`;
  } else if (notice.kind === "seized") {
    title = "Ngân hàng đã siết khoản nợ";
    body = `${notice.amount} ${BRAND.currency} đã bị trừ khỏi két. Khoản vay đã tất toán.`;
  } else {
    title = "Tiệm đã phá sản";
    body = `Dư nợ ${notice.balance} ${BRAND.currency} không thể thanh toán khi bị siết. Ván chơi sẽ phải bắt đầu lại từ đầu.`;
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal operations-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-title"
      >
        <span className="eyebrow">Ngân hàng & an ninh</span>
        <h1 id="finance-title">{title}</h1>
        <p>{body}</p>
        <div className="dialog-actions">
          {notice.kind === "loan-due" && (
            <GameButton
              tone="primary"
              size="large"
              disabled={
                !state.finance.loan || state.money < state.finance.loan.balance
              }
              onClick={repay}
            >
              Trả {state.finance.loan?.balance ?? 0} {BRAND.currency}
            </GameButton>
          )}
          {notice.kind === "bankrupt" ? (
            <GameButton
              tone="danger"
              size="large"
              onClick={() =>
                bridge.dispatch({ type: "restartAfterBankruptcy" })
              }
            >
              Chơi lại từ đầu
            </GameButton>
          ) : (
            <GameButton tone="secondary" size="large" onClick={acknowledge}>
              {notice.kind === "loan-due" ? "Để sau" : "Đã hiểu"}
            </GameButton>
          )}
        </div>
      </section>
    </div>
  );
}

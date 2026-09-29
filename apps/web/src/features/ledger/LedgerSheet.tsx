import {
  canRunUnattended,
  dailyWages,
  dayProgress,
  dayReport,
  totalWagesOwed,
  wagesDueToday,
  type DayReport,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { ClockIcon, WarningIcon } from "../../art/Icons";
import { BRAND } from "../../brand";
import { formatRating } from "../../ui/Stars";
import { EmptyState, PanelHeading } from "../../ui/primitives";
import { DayGrade, ProfitTable } from "../day/DaySummaryDialog";
import { percent, signed } from "../day/dayText";

export { signed };

export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))} giây`;
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/** Sổ sách: hôm nay (tạm tính), lương, và tổng kết các ngày trước. */
export function LedgerSheet({ state }: { state: DeepReadonly<SimState> }) {
  const today = dayReport(state);
  const wages = dailyWages(state);
  const dueToday = wagesDueToday(state);
  const owed = totalWagesOwed(state);
  const progress = dayProgress(state);
  const secondsLeft = Math.ceil(((1 - progress) * state.config.dayMs) / 1000);
  const past = [...state.dayReports].reverse();

  return (
    <div className="panel ledger">
      <PanelHeading description="Lãi lỗ theo hoạt động, dòng tiền và lương theo ca.">
        Sổ sách · Ngày {state.day}
      </PanelHeading>
      <div
        className="day-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Tiến độ ngày"
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="muted small">
        Còn khoảng {secondsLeft} giây tới cuối ngày. Cuối ngày tiệm trả lương
        theo số ca đã làm và chốt sổ.
      </p>
      <p className={state.operations.score <= 25 ? "notice bad" : "notice"}>
        <span>
          Điểm quản lý vùng: <b>{state.operations.score}/100</b> · Đã điều
          chuyển {state.operations.transfers} lần. Điểm thay đổi theo sự cố, kết
          quả bán hàng, hạn dùng, giao hàng và nợ lương.
        </span>
      </p>

      <h3>Hôm nay (tạm tính)</h3>
      <ProfitTable report={today} />
      <dl className="ledger-rows">
        {dueToday + owed > 0 && (
          <Row
            label="Lương cuối ngày (dự kiến)"
            value={-(dueToday + owed)}
            muted
          />
        )}
        <Row
          label="Nhập hàng (thành hàng tồn)"
          value={-today.stockCost}
          muted
        />
        {today.investments - today.vouchers > 0 && (
          <Row
            label="Tuyển người, nâng cấp"
            value={-(today.investments - today.vouchers)}
            muted
          />
        )}
      </dl>
      {today.returningCustomers > 0 && (
        <p className="muted small">
          {today.returningCustomers} khách quen quay lại hôm nay.
        </p>
      )}

      {owed > 0 && (
        <div className="notice bad" role="alert">
          <WarningIcon size={18} />
          Đang nợ lương {owed} {BRAND.currency}. Nhân viên bị nợ lương làm chậm
          hơn 20% cho tới khi được trả đủ vào cuối ngày.
        </div>
      )}
      {wages > 0 && !canRunUnattended(state) && (
        <p className="notice warn">
          <WarningIcon size={18} />
          Bạn đang tự đứng quầy: khi rời game, tiệm đóng cửa. Giao quầy cho nhân
          viên để tiệm tự bán khi bạn vắng mặt (tính tối đa{" "}
          {formatDuration(state.config.offlineCapMs)}).
        </p>
      )}

      <h3>Các ngày trước</h3>
      {past.length === 0 ? (
        <EmptyState icon={<ClockIcon />} title="Chưa chốt ngày nào">
          Báo cáo ngày đầu tiên sẽ hiện ở đây khi hết ngày.
        </EmptyState>
      ) : (
        <ul className="card-list">
          {past.map((r) => (
            <li key={r.day}>
              <DayReportCard report={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: number;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`${strong ? "strong" : ""} ${muted ? "muted" : ""}`}>
      <dt>{label}</dt>
      <dd className={value > 0 ? "pos" : value < 0 ? "neg" : ""}>
        {signed(value)}
      </dd>
    </div>
  );
}

export function DayReportCard({ report }: { report: DeepReadonly<DayReport> }) {
  // Báo cáo từ save cũ (trước khi có ca làm) không có giá vốn: chỉ hiện dòng tiền.
  const legacy = report.shifts.length === 0;
  const value = legacy ? report.profit : report.netProfit;
  return (
    <div className="day-card">
      <div className="day-card-head">
        <strong>Ngày {report.day}</strong>
        {!legacy && <DayGrade report={report} size={16} />}
        <b className={value >= 0 ? "pos" : "neg"}>{signed(value)}</b>
      </div>
      <span className="small">
        {legacy
          ? `Dòng tiền · thu ${report.revenue} ${BRAND.currency}`
          : `Lãi ròng · thu ${report.revenue} ${BRAND.currency}${report.revenue > 0 ? `, biên ${percent(report.netProfit / report.revenue)}` : ""}`}
        {report.wages > 0 && ` · lương ${report.wages}`}
      </span>
      <span className="small muted">
        {report.customers} khách · {report.sales} lượt bán · {report.referrals}{" "}
        lần khuyên đi khám
        {report.leftAngry + report.turnedAway > 0 &&
          ` · ${report.leftAngry + report.turnedAway} khách bỏ về`}
        {report.avgStars !== null &&
          ` · ${formatRating(report.avgStars)}★ (${report.reviews} đánh giá)`}
        {report.returningCustomers > 0 &&
          ` · ${report.returningCustomers} khách quen`}
        {report.expiredStock > 0 && ` · ${report.expiredStock} món hết hạn`}
      </span>
      {report.wagesOwed > 0 && (
        <span className="small neg">
          Còn nợ lương {report.wagesOwed} {BRAND.currency}
        </span>
      )}
    </div>
  );
}

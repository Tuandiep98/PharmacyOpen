import { useState } from "react";
import {
  COLLECTIBLES,
  dayGoals,
  PREP_TASK_IDS,
  serviceRate,
  type DayReport,
  type DeepReadonly,
} from "@pharmacy/simulation";
import {
  CheckIcon,
  ChevronDownIcon,
  CoinIcon,
  CrossMarkIcon,
  StarIcon,
  TrophyIcon,
  WarningIcon,
} from "../../art/Icons";
import { CollectibleIcon } from "../../art/Collectibles";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { formatRating } from "../../ui/Stars";
import { GameButton } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { gradeNameClass } from "../../ui/gradeName";
import { ItemEffects } from "../collection/itemText";
import {
  GOAL_LABEL,
  percent,
  SHIFT_LABEL,
  signed,
  signedNumber,
} from "./dayText";
import "./day.css";

/** Tổng kết cuối ngày: xếp hạng theo mục tiêu, lãi lỗ theo hoạt động, chỉ số vận hành và từng ca. */
export function DaySummaryDialog({
  report,
  onClose,
}: {
  report: DeepReadonly<DayReport>;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div
        className="modal day-summary"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-summary-title"
      >
        <h1 id="day-summary-title">Kết thúc ngày {report.day}</h1>
        <DayGrade report={report} />
        <DayRewardCard report={report} onClose={onClose} />
        <p className={report.operationsScore <= 25 ? "notice bad" : "notice"}>
          Đánh giá vận hành: <b>{report.operationsScore}/100</b> (
          {signedNumber(report.operationsChange)} điểm hôm nay).
          {report.operationsScore <= 15 &&
            " Quản lý vùng đã ra quyết định điều chuyển."}
        </p>
        {report.wagesOwed > 0 && (
          <p className="notice bad day-wage-warning" role="alert">
            <WarningIcon size={18} />
            Không đủ xu trả lương: còn nợ nhân viên {report.wagesOwed}{" "}
            {BRAND.currency}.
          </p>
        )}
        <div className="day-summary-body">
          <div className="day-highlights">
            <div className="day-highlight">
              <span>Lãi ròng</span>
              <strong className={report.netProfit >= 0 ? "pos" : "neg"}>
                {signedNumber(report.netProfit)}
                <small>{BRAND.currency}</small>
              </strong>
            </div>
            <div className="day-highlight">
              <span>Đã phục vụ</span>
              <strong>
                {report.sales + report.referrals + report.backorders}
                <small>/{report.customers} khách</small>
              </strong>
            </div>
            <div className="day-highlight">
              <span>Khách bỏ về</span>
              <strong
                className={
                  report.leftAngry + report.turnedAway > 0 ? "neg" : "pos"
                }
              >
                {report.leftAngry + report.turnedAway}
              </strong>
            </div>
          </div>
          <DayGoalList report={report} />
          <details className="day-details">
            <summary>Xem sổ sách và các chỉ số</summary>
            <ProfitTable report={report} />
            <DayMetrics report={report} />
            {report.shifts.length > 0 && <ShiftTable report={report} />}
          </details>
        </div>
        <div className="modal-actions">
          <GameButton tone="primary" size="large" onClick={onClose} autoFocus>
            Sang ngày {report.day + 1}
          </GameButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Thưởng mục tiêu ngày (xu và có thể một món sưu tầm), độ nhận biết của tiệm và thứ hạng khu vực sau
 * khi chốt ngày. Món mới chỉ báo tên; chạm vào để mở chỉ số và nút đặt/đeo.
 */
function DayRewardCard({
  report,
  onClose,
}: {
  report: DeepReadonly<DayReport>;
  onClose: () => void;
}) {
  const bridge = useBridge();
  const openView = useUi((s) => s.openView);
  const [itemOpen, setItemOpen] = useState(false);
  const state = bridge.state;
  const item = report.reward.itemUid
    ? state.collection.items.find((i) => i.uid === report.reward.itemUid)
    : undefined;
  const def = item ? COLLECTIBLES[item.defId] : undefined;
  const standing = state.standing;
  const ranks = [
    ["Doanh thu", standing.revenue],
    ["Đánh giá", standing.rating],
    ["Nhân viên", standing.staff],
  ] as const;
  return (
    <section className="day-reward" aria-label="Thưởng và tiến triển trong ngày">
      <div className="day-reward-row">
        <CoinIcon size={26} />
        <span>
          <b>
            {report.reward.coins > 0
              ? `Thưởng mục tiêu +${report.reward.coins} ${BRAND.currency}`
              : "Chưa có thưởng mục tiêu"}
          </b>
          <span className="small muted">
            {report.grade > 0
              ? `${report.grade}/3 mục tiêu đạt · thưởng tăng theo cấp tiệm`
              : "Đạt ít nhất 1 mục tiêu để nhận xu, 2–3 mục tiêu để có cơ hội nhận đồ sưu tầm"}
          </span>
        </span>
      </div>
      <div className="day-reward-row">
        <TrophyIcon size={26} />
        <span>
          <b>
            Người biết tới tiệm: {Math.round(report.awareness)}/100{" "}
            <span className={report.awarenessChange >= 0 ? "pos" : "neg"}>
              ({signedNumber(Math.round(report.awarenessChange * 10) / 10)})
            </span>
          </b>
          <span className="small muted">
            Top khu vực:{" "}
            {ranks
              .map(([label, rank]) => `${label} ${rank ? `#${rank}` : "–"}`)
              .join(" · ")}
          </span>
        </span>
      </div>
      {item && def && (
        <div className={`day-reward-item${itemOpen ? " open" : ""}`}>
          <button
            type="button"
            className="day-reward-item-head"
            aria-expanded={itemOpen}
            aria-controls="day-reward-item-detail"
            onClick={() => setItemOpen((v) => !v)}
          >
            <span className="item-card-icon">
              <CollectibleIcon defId={item.defId} grade={item.grade} effects={item.effects} size={44} />
              <span className={`grade-badge grade-${item.grade} size-sm`}>
                {item.grade}
              </span>
            </span>
            <span className="day-reward-item-text">
              <span className="day-reward-item-eyebrow">
                Nhận được đồ sưu tầm
              </span>
              <b className={gradeNameClass(item.grade)}>{def.name}</b>
            </span>
            <span className="day-reward-item-chevron" aria-hidden>
              <ChevronDownIcon size={20} />
            </span>
          </button>
          {itemOpen && (
            <div id="day-reward-item-detail" className="day-reward-item-detail">
              <ItemEffects item={item} />
              <GameButton
                size="small"
                tone="secondary"
                className="day-reward-item-action"
                onClick={() => {
                  openView({ tab: "expansion", view: "collection" });
                  onClose();
                }}
              >
                Đặt / đeo
              </GameButton>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function DayGrade({
  report,
  size = 30,
}: {
  report: DeepReadonly<DayReport>;
  size?: number;
}) {
  const total = dayGoals(report).length;
  return (
    <span
      className="day-grade"
      role="img"
      aria-label={`Xếp hạng ngày: ${report.grade} trên ${total} sao`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < report.grade ? "on" : "off"} aria-hidden>
          <StarIcon size={size} />
        </span>
      ))}
    </span>
  );
}

function DayGoalList({ report }: { report: DeepReadonly<DayReport> }) {
  return (
    <ul className="goal-list">
      {dayGoals(report).map((goal) => (
        <li key={goal.id} className={goal.met ? "met" : "missed"}>
          {goal.met ? <CheckIcon size={18} /> : <CrossMarkIcon size={18} />}
          <span>{GOAL_LABEL[goal.id]}</span>
          <span className="sr-only">{goal.met ? "đạt" : "chưa đạt"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Lãi lỗ theo hoạt động; nhập hàng và đầu tư chỉ là dòng tiền nên tách riêng bên dưới. */
export function ProfitTable({ report }: { report: DeepReadonly<DayReport> }) {
  const gross = report.revenue - report.costOfSales;
  const margin = (value: number) =>
    report.revenue > 0 ? ` (${percent(value / report.revenue)})` : "";
  return (
    <dl className="ledger-rows">
      <Row
        label={
          report.tips > 0
            ? `Doanh thu (gồm ${report.tips} xu khách boa)`
            : "Doanh thu"
        }
        value={report.revenue}
      />
      <Row label="Giá vốn hàng đã bán" value={-report.costOfSales} />
      <Row label={`Lãi gộp${margin(gross)}`} value={gross} strong />
      {report.wages > 0 && (
        <Row label="Lương nhân viên" value={-report.wages} />
      )}
      {report.vouchers > 0 && (
        <Row label="Phiếu giảm giá" value={-report.vouchers} />
      )}
      {report.operationsCost > 0 && (
        <Row label="Xử lý sự cố vận hành" value={-report.operationsCost} />
      )}
      {report.expiredCost > 0 && (
        <Row
          label={`Hàng hết hạn (${report.expiredStock} món)`}
          value={-report.expiredCost}
        />
      )}
      {/* Đối soát két cuối ngày: tiền két khớp sổ trừ khi có người "cầm nhầm". */}
      {report.pilfered > 0 && (
        <Row label="Đối soát két: thiếu" value={-report.pilfered} />
      )}
      <Row
        label={`Lãi ròng${margin(report.netProfit)}`}
        value={report.netProfit}
        strong
      />
      <Row label="Dòng tiền trong ngày" value={report.profit} muted />
    </dl>
  );
}

function DayMetrics({ report }: { report: DeepReadonly<DayReport> }) {
  const rate = serviceRate(report);
  const lost = report.leftAngry + report.turnedAway;
  const rows: [string, string][] = [
    [
      "Khách ghé",
      `${report.customers}${report.returningCustomers > 0 ? ` · ${report.returningCustomers} khách quen` : ""}`,
    ],
    [
      "Tỉ lệ phục vụ",
      rate === null
        ? "—"
        : `${percent(rate)} (${report.sales} bán · ${report.referrals} khuyên đi khám)`,
    ],
    [
      "Khách bỏ về",
      report.customers > 0
        ? `${lost} (${percent(lost / report.customers)})`
        : String(lost),
    ],
    [
      "Đơn ship",
      report.deliveries + report.cancelledDeliveries === 0
        ? "chưa có"
        : `${report.deliveries} đã giao${report.lateDeliveries > 0 ? ` · ${report.lateDeliveries} trễ hẹn` : ""}${report.cancelledDeliveries > 0 ? ` · ${report.cancelledDeliveries} bị huỷ` : ""}`,
    ],
    ...(report.backorders + report.wentElsewhere > 0
      ? [
          [
            "Hết hàng ở quầy",
            `${report.backorders} khách hẹn giao sau · ${report.wentElsewhere} đi chỗ khác`,
          ] as [string, string],
        ]
      : []),
    [
      "Trò chuyện với khách quen",
      report.chats > 0
        ? `${report.chats} lượt · ${report.chatsCompleted} lượt kể trọn chuyện`
        : "chưa có",
    ],
    [
      "Giá trị trung bình đơn",
      report.sales > 0
        ? `${Math.round(report.revenue / report.sales)} ${BRAND.currency}`
        : "—",
    ],
    [
      "Chờ trung bình",
      report.avgWaitMs === null
        ? "—"
        : `${Math.round(report.avgWaitMs / 1000)} giây`,
    ],
    [
      "Đánh giá",
      report.avgStars === null
        ? `chưa có mới · tiệm ${formatRating(report.storeRating)}★`
        : `${formatRating(report.avgStars)}★ (${report.reviews}) · tiệm ${formatRating(report.storeRating)}★`,
    ],
  ];
  if (report.prepDone !== null)
    rows.push([
      "Chuẩn bị mở cửa",
      `${report.prepDone}/${PREP_TASK_IDS.length} việc`,
    ]);
  rows.push([
    "Đối soát két",
    report.pilfered > 0
      ? `thiếu ${report.pilfered} ${BRAND.currency} — có người cầm nhầm?`
      : "khớp sổ",
  ]);
  return (
    <dl className="ledger-rows day-metrics">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ShiftTable({ report }: { report: DeepReadonly<DayReport> }) {
  return (
    <table className="shift-table">
      <caption>Theo ca</caption>
      <thead>
        <tr>
          <th scope="col">Ca</th>
          <th scope="col">Khách</th>
          <th scope="col">Bán</th>
          <th scope="col">Bỏ về</th>
          <th scope="col">Thu</th>
        </tr>
      </thead>
      <tbody>
        {report.shifts.map((s) => (
          <tr key={s.shift}>
            <th scope="row">
              {SHIFT_LABEL[s.shift]}
              <span className="small muted">{s.staff.join(", ")}</span>
            </th>
            <td>{s.customers}</td>
            <td>{s.sales}</td>
            <td>{s.lost}</td>
            <td>{s.revenue}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

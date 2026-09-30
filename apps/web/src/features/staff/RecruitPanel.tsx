import { useState } from "react";
import {
  arrivalFactor,
  currentShift,
  demandMultiplier,
  GRADE_THRESHOLDS,
  nextStaffUpgrade,
  PRODUCTS,
  SHIFT_IDS,
  shiftHeadcount,
  staffLimits,
  unlockedProducts,
  UPGRADES,
  type DeepReadonly,
  type Grade,
  type Recruit,
  type SimState,
} from "@pharmacy/simulation";
import { StaffFigure } from "../../art/Character";
import { ChevronDownIcon, PadlockIcon, StaffIcon } from "../../art/Icons";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { EmptyState, GameButton, PanelHeading } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { SHIFT_LABEL } from "../day/dayText";
import { REJECT_TEXT } from "../store/rejectText";
import { GradeBadge, gradeOf, nameClassOf } from "./GradeBadge";
import { StatBars, TraitDetails, TraitTags } from "./StaffPanel";

const ROLE: Record<string, string> = {
  pharmacist: "Dược sĩ",
  clerk: "Nhân viên bán hàng",
};

const GRADE_NOTE: Record<Grade, string> = {
  S: "Xuất sắc: tự lo quầy đông, ít sai, khách quý.",
  A: "Giỏi: đứng quầy chính được ngay.",
  B: "Khá: ổn cho ca vắng hoặc lo kho.",
  C: "Cơ bản: rẻ, cần thời gian lên tay nghề.",
};

/**
 * Ước tính lãi gộp một ca người này làm ra nếu đứng quầy, theo lượng khách hiện tại của tiệm và
 * biên lãi trung bình các món đang bán. Chỉ để so sánh với lương, không phải lời hứa.
 */
export function shiftValueEstimate(
  state: DeepReadonly<SimState>,
  score: number,
): number {
  const open =
    (state.config.dayMs - state.config.prepMs - state.config.closingMs) / 2;
  const interval =
    (state.config.spawnIntervalMs[0]! + state.config.spawnIntervalMs[1]!) / 2;
  const customers =
    (open / interval) * arrivalFactor(state) * demandMultiplier(state);
  const products = unlockedProducts(state);
  const margin =
    products.reduce((sum, id) => sum + state.prices[id] - PRODUCTS[id].cost, 0) /
    Math.max(1, products.length);
  // Người giỏi phục vụ kịp và đúng nhiều khách hơn (khoảng 55% → 95% số khách).
  const served = 0.55 + 0.4 * Math.min(1, score / 100);
  return Math.round(customers * served * margin);
}

/** Tuyển dụng: ứng viên hôm nay tách khỏi danh sách đội để xem và so sánh ngay. */
export function RecruitPanel({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const setTab = useUi((s) => s.setTab);
  const limits = staffLimits(state);
  const staffCount = Object.values(state.workers).filter(
    (w) => w.controller === "ai",
  ).length;
  const full = staffCount >= limits.total;
  const rerolled = state.recruitRerollDay === state.day;
  const cost = state.config.recruitRerollCost;
  const nextId = nextStaffUpgrade(state);
  const now = currentShift(state);
  const openShift = [now, ...SHIFT_IDS.filter((s) => s !== now)].find(
    (s) => shiftHeadcount(state, s) < limits.perShift,
  );
  return (
    <>
      <PanelHeading description="Ứng viên đổi mới mỗi sáng; khoá ô để giữ người sang ngày sau. Chữ dưới chân dung là hạng năng lực, chạm để xem cách tính.">
        Tuyển dụng
      </PanelHeading>
      <section className="recruit-summary" aria-label="Tình hình đội">
        <div>
          <span className="small muted">Đội</span>
          <strong>
            {staffCount}/{limits.total}
          </strong>
        </div>
        <div>
          <span className="small muted">Ca còn trống</span>
          <strong>
            {full ? "Hết chỗ" : openShift ? SHIFT_LABEL[openShift] : "Các ca đã đủ"}
          </strong>
        </div>
        <div>
          <span className="small muted">Đang có</span>
          <strong>
            {state.money} {BRAND.currency}
          </strong>
        </div>
        <GameButton
          size="small"
          disabled={rerolled || state.money < cost}
          onClick={() => {
            const r = bridge.dispatch({ type: "rerollRecruits" });
            if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
          }}
        >
          {rerolled ? "Đã làm mới hôm nay" : `Làm mới · ${cost} ${BRAND.currency}`}
        </GameButton>
      </section>
      {full && (
        <p className="notice warn small">
          Đội đã đủ chỗ.{" "}
          {nextId
            ? `Nâng ${UPGRADES[nextId]?.name ?? "cửa hàng"} để có thêm chỗ.`
            : "Tiệm đã ở quy mô tối đa."}{" "}
          {nextId && (
            <GameButton
              tone="quiet"
              surface="flat"
              size="small"
              className="link-btn"
              onClick={() => setTab("expansion")}
            >
              Mở rộng
            </GameButton>
          )}
        </p>
      )}
      <details className="grade-legend">
        <summary>Hạng S · A · B · C được chấm thế nào?</summary>
        <p className="small">
          Điểm năng lực 0–100 gộp: hiểu hàng (34), tốc độ (32), giao tiếp (24) và
          đặc điểm (±10); dược sĩ +3. S từ {GRADE_THRESHOLDS.S}, A từ{" "}
          {GRADE_THRESHOLDS.A}, B từ {GRADE_THRESHOLDS.B}. Lương tỉ lệ với năng
          lực, có trần nên người giỏi không đắt quá tầm. Làm lâu lên tay nghề thì
          hạng có thể tăng.
        </p>
        <ul className="grade-legend-list">
          {(["S", "A", "B", "C"] as const).map((g) => (
            <li key={g}>
              <span className={`grade-badge grade-${g} size-sm`}>{g}</span>
              <span className="small">{GRADE_NOTE[g]}</span>
            </li>
          ))}
        </ul>
      </details>
      {state.recruits.every((r) => r === null) ? (
        <EmptyState icon={<StaffIcon />} title="Đã tuyển hết ứng viên hôm nay">
          Sáng mai sẽ có ứng viên mới.
        </EmptyState>
      ) : (
        <ul className="card-list recruit-list">
          {state.recruits.map((recruit, slot) =>
            recruit ? (
              <RecruitCard
                key={recruit.id}
                state={state}
                recruit={recruit}
                slot={slot}
                full={full}
              />
            ) : null,
          )}
        </ul>
      )}
    </>
  );
}

function RecruitCard({
  state,
  recruit,
  slot,
  full,
}: {
  state: DeepReadonly<SimState>;
  recruit: DeepReadonly<Recruit>;
  slot: number;
  full: boolean;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const affordable = state.money >= recruit.hireCost;
  const grade = gradeOf(recruit);
  const value = grade ? shiftValueEstimate(state, grade.score) : 0;
  const run = (command: Parameters<typeof bridge.dispatch>[0]) => {
    const r = bridge.dispatch(command);
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
  };
  return (
    <li
      className={`staff-card recruit-card grade-border-${grade?.grade ?? "C"}${open ? " open" : ""}`}
    >
      <div className="recruit-top">
        <span className="staff-avatar recruit-avatar">
          <svg width={60} height={60} viewBox="-34 -112 68 68" aria-hidden>
            <circle
              cx={0}
              cy={-78}
              r={33}
              fill={recruit.role === "pharmacist" ? "#DCEFE3" : "#F8ECD6"}
            />
            <StaffFigure
              look={recruit.look}
              role={recruit.role}
              expression="happy"
            />
          </svg>
          <GradeBadge subject={recruit} size="lg" />
        </span>
        <div className="staff-info">
          <strong className={nameClassOf(recruit)}>{recruit.name}</strong>
          <span className="small muted">{ROLE[recruit.role]}</span>
          <span className="small muted">{recruit.blurb}</span>
        </div>
        <GameButton
          surface="custom"
          className={`lock-btn ${recruit.locked ? "locked" : ""}`}
          aria-pressed={recruit.locked}
          aria-label={
            recruit.locked
              ? `Bỏ khoá ${recruit.name}`
              : `Khoá ${recruit.name} để giữ sang ngày sau`
          }
          onClick={() =>
            run({ type: "lockRecruit", slot, locked: !recruit.locked })
          }
        >
          <PadlockIcon open={!recruit.locked} size={22} />
        </GameButton>
      </div>
      <TraitTags traits={recruit.traits} hidden={recruit.hiddenTraits.length} />
      <StatBars
        speed={recruit.speed}
        knowledge={recruit.knowledge}
        communication={recruit.communication}
      />
      <button
        type="button"
        className="recruit-toggle"
        aria-expanded={open}
        aria-controls={`recruit-detail-${recruit.id}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Thu gọn" : "Xem lương & tuyển"}</span>
        <span className="recruit-toggle-chevron" aria-hidden>
          <ChevronDownIcon size={20} />
        </span>
      </button>
      {open && (
        <div id={`recruit-detail-${recruit.id}`} className="recruit-detail">
          <dl className="recruit-money">
            <div>
              <dt>Lương</dt>
              <dd>
                {recruit.wage} {BRAND.currency}/ca
              </dd>
            </div>
            <div>
              <dt>Ước làm ra</dt>
              <dd className={value > recruit.wage ? "pos" : "neg"}>
                ~{value} {BRAND.currency} lãi gộp/ca
              </dd>
            </div>
          </dl>
          <div className="recruit-actions">
            {recruit.hiddenTraits.length > 0 && (
              <GameButton
                size="small"
                disabled={state.money < state.config.interviewCost}
                onClick={() => run({ type: "interviewRecruit", slot })}
              >
                Phỏng vấn · {state.config.interviewCost} {BRAND.currency}
              </GameButton>
            )}
            <GameButton
              tone="primary"
              size="small"
              disabled={full || !affordable}
              onClick={() => run({ type: "hire", candidateId: recruit.id })}
            >
              {full
                ? "Đội đã đủ người"
                : affordable
                  ? `Tuyển · ${recruit.hireCost} ${BRAND.currency}`
                  : `Cần ${recruit.hireCost} ${BRAND.currency}`}
            </GameButton>
          </div>
          <TraitDetails traits={recruit.traits} />
        </div>
      )}
    </li>
  );
}

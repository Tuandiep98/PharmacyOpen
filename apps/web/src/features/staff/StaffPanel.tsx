import {
  currentShift,
  dailyWages,
  isOnDuty,
  LEVEL_XP,
  MAX_LEVEL,
  nextStaffUpgrade,
  QUIT_FATIGUE,
  REASONS,
  serviceTone,
  type ReasonCode,
  type ServiceTone,
  retainWage,
  SHIFT_IDS,
  shiftHeadcount,
  staffLimits,
  stationHeadcount,
  stationOf,
  STATION_IDS,
  STATIONS,
  TRAITS,
  UPGRADES,
  type DeepReadonly,
  type StationId,
  type ShiftId,
  type SimState,
  type TraitId,
  type Worker,
  wagesDueTonight,
} from "@pharmacy/simulation";
import { SHIFT_LABEL } from "../day/dayText";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { useUi } from "../../ui/uiStore";
import { GameButton, PanelHeading } from "../../ui/primitives";
import { Segmented } from "../../ui/Segmented";
import {
  CoinIcon,
  RecruitIcon,
  StaffIcon,
  WarningIcon,
} from "../../art/Icons";
import { REJECT_TEXT } from "../store/rejectText";
import { useServiceActions } from "../store/useServiceActions";
import { DismissButton } from "./DismissButton";
import { staffAlerts } from "./staffAlerts";
import { CounterCard } from "./CounterAssign";
import { ActivityBadge } from "./ActivityBadge";
import { gradeOf, nameClassOf, StaffAvatar } from "./GradeBadge";
import { RecruitPanel } from "./RecruitPanel";
import "./staff.css";

const ROLE: Record<string, string> = {
  pharmacist: "Dược sĩ",
  clerk: "Nhân viên bán hàng",
};

export { workerStatus } from "./workerStatus";

export function StatBars({
  speed,
  knowledge,
  communication,
}: {
  speed: number;
  knowledge: number;
  communication: number;
}) {
  // speed là hệ số quanh 1; quy về 0..1 để vẽ (0.5 → 0, 1.5 → 1).
  const rows = [
    { label: "Tốc độ", value: Math.max(0, Math.min(1, speed - 0.5)) },
    { label: "Hiểu sản phẩm", value: knowledge },
    { label: "Giao tiếp", value: communication },
  ];
  return (
    <dl className="stat-bars">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>
            <span
              className="stat-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(r.value * 100)}
              aria-label={r.label}
            >
              <span style={{ width: `${r.value * 100}%` }} />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Đặc điểm tô màu theo loại: xanh có lợi, đỏ có hại, vàng vừa lợi vừa hại; đặc điểm ẩn hiện "???". */
export function TraitTags({
  traits,
  hidden,
}: {
  traits: readonly TraitId[];
  hidden: number;
}) {
  if (traits.length === 0 && hidden === 0)
    return <span className="small muted">Không có đặc điểm nổi bật</span>;
  return (
    <span className="trait-tags">
      {traits.map((id) => (
        <span
          key={id}
          className={`tag trait tone-${TRAITS[id].tone}`}
          title={TRAITS[id].description}
        >
          {TRAITS[id].name}
        </span>
      ))}
      {Array.from({ length: hidden }, (_, i) => (
        <span
          key={`hidden-${i}`}
          className="tag trait tone-hidden"
          title="Đặc điểm ẩn: lộ ra sau ca làm đầu tiên."
        >
          ???
        </span>
      ))}
    </span>
  );
}

/** Mô tả đầy đủ các đặc điểm đã biết, cho phần mở rộng của thẻ. */
export function TraitDetails({ traits }: { traits: readonly TraitId[] }) {
  if (traits.length === 0) return null;
  return (
    <ul className="trait-details">
      {traits.map((id) => (
        <li key={id} className={`tone-${TRAITS[id].tone}`}>
          <b>{TRAITS[id].name}:</b> {TRAITS[id].description}
        </li>
      ))}
    </ul>
  );
}

/** Hai thước đo tách biệt: nghiệp vụ (khách quan) và đánh giá cá nhân (chủ quan, đã loại lỗi không do người này). */
export function WorkerMetrics({ worker }: { worker: DeepReadonly<Worker> }) {
  return (
    <span className="small worker-metrics">
      Nghiệp vụ:{" "}
      <b>
        {worker.perfCount
          ? `${Math.round(worker.perfSum / worker.perfCount)}/100`
          : "—"}
      </b>
      {" · "}Đánh giá cá nhân:{" "}
      <b>
        {worker.repCount
          ? `${(worker.repStarsSum / worker.repCount).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}★ (${worker.repCount})`
          : "—"}
      </b>
    </span>
  );
}

const TONE_LABEL: Record<ServiceTone, string> = {
  warm: "Niềm nở",
  plain: "Bình thường",
  curt: "Cộc lốc",
  chatty: "Nói nhiều",
  awkward: "Lúng túng",
};

/**
 * Nhận xét của khách về một người: giọng giao tiếp (cùng tiêu chí khách dùng để chấm) và các lý do
 * khen/chê được nhắc nhiều nhất trong các đánh giá tính cho người đó.
 */
export function ReviewTraits({
  state,
  worker,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
}) {
  const counts = new Map<ReasonCode, number>();
  for (const review of state.reviews) {
    if (review.workerId !== worker.id || !review.countsForStaff) continue;
    for (const reason of review.reasons) {
      const scope = REASONS[reason].scope;
      if (scope === "praise" || scope === "staff")
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const praise = ranked
    .filter(([r]) => REASONS[r].scope === "praise")
    .slice(0, 2);
  const complaint = ranked
    .filter(([r]) => REASONS[r].scope === "staff")
    .slice(0, 1);
  const tone = serviceTone({
    communication: worker.communication,
    traits: [...worker.traits, ...worker.hiddenTraits],
  });
  return (
    <span
      className="review-traits"
      aria-label={`Nhận xét của khách về ${worker.name}`}
    >
      <span
        className={`tag tone-tag tone-${tone}`}
        title="Giọng giao tiếp khi đứng quầy"
      >
        Giọng: {TONE_LABEL[tone]}
      </span>
      {praise.map(([reason, n]) => (
        <span key={reason} className="tag review-good">
          + {REASONS[reason].label} ×{n}
        </span>
      ))}
      {complaint.map(([reason, n]) => (
        <span key={reason} className="tag review-bad">
          − {REASONS[reason].label} ×{n}
        </span>
      ))}
    </span>
  );
}

/** Lương và nợ lương của một nhân viên NPC. */
export function WageLine({ worker }: { worker: DeepReadonly<Worker> }) {
  if (worker.controller !== "ai") return null;
  return (
    <span className="small">
      Lương {worker.wage} {BRAND.currency}/ca ·{" "}
      {worker.wage * worker.shifts.length} {BRAND.currency}/ngày theo lịch
      {worker.wageOwed > 0 && (
        <b className="neg"> · đang nợ {worker.wageOwed} — làm chậm hơn</b>
      )}
    </span>
  );
}

/** Cấp tay nghề và kinh nghiệm tới cấp sau. */
export function LevelBar({ worker }: { worker: DeepReadonly<Worker> }) {
  const floor = LEVEL_XP[worker.level - 1] ?? 0;
  const next = LEVEL_XP[worker.level];
  const ratio =
    next === undefined
      ? 1
      : Math.max(0, Math.min(1, (worker.xp - floor) / (next - floor)));
  return (
    <span className="meter-line">
      <b className="level-badge">Cấp {worker.level}</b>
      <span
        className="progress-track"
        role="progressbar"
        aria-label={`Kinh nghiệm của ${worker.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <span className="progress-fill" style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="small muted">
        {worker.level >= MAX_LEVEL
          ? "Tối đa"
          : `${worker.xp - floor}/${(next ?? floor) - floor}`}
      </span>
    </span>
  );
}

/** Thanh mệt: xanh → vàng → đỏ; chạm đỉnh thì người đó xin thôi việc. */
function FatigueBar({ worker }: { worker: DeepReadonly<Worker> }) {
  const ratio = Math.max(0, Math.min(1, worker.fatigue / QUIT_FATIGUE));
  const level = ratio >= 0.7 ? "high" : ratio >= 0.35 ? "mid" : "low";
  return (
    <span className="meter-line">
      <b className="meter-label">Mệt</b>
      <span
        className={`progress-track fatigue-${level}`}
        role="meter"
        aria-label={`Độ mệt của ${worker.name}`}
        aria-valuemin={0}
        aria-valuemax={QUIT_FATIGUE}
        aria-valuenow={worker.fatigue}
      >
        <span className="progress-fill" style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="small muted">
        {worker.fatigue}/{QUIT_FATIGUE}
      </span>
    </span>
  );
}

/** Người xin thôi việc: tăng lương giữ chân hoặc đồng ý cho nghỉ. Hết ngày chưa quyết thì tự nghỉ. */
function ResignNotice({ worker }: { worker: DeepReadonly<Worker> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const retain = () => {
    const r = bridge.dispatch({ type: "retainStaff", workerId: worker.id });
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
  };
  return (
    <div className="resign-notice" role="alert">
      <p className="resign-text">
        <WarningIcon size={18} />
        <span>
          <b>Xin thôi việc vì quá sức</b>
          <span className="small">Chưa giữ chân thì nghỉ hẳn cuối ngày.</span>
        </span>
      </p>
      <div className="resign-actions">
        <GameButton size="small" tone="primary" onClick={retain}>
          Giữ chân
          <small>
            {worker.wage} → {retainWage(worker.wage)} {BRAND.currency}/ca
          </small>
        </GameButton>
        <DismissButton worker={worker} />
      </div>
    </div>
  );
}

/**
 * Tổng lương phải trả lúc đóng ngày cho cả đội (nợ cũ + các ca hôm nay theo lịch), so với tiền đang có.
 * Thiếu thì cảnh báo trước: cuối ngày không đủ xu sẽ ghi nợ và nhân viên bị nợ làm chậm hơn.
 */
function WageSummary({ state }: { state: DeepReadonly<SimState> }) {
  const { owed, today, total } = wagesDueTonight(state);
  if (total === 0) return null;
  const short = total - state.money;
  return (
    <section
      className={`wage-summary ${short > 0 ? "short" : ""}`}
      aria-label="Lương phải trả cuối ngày"
    >
      <CoinIcon size={30} />
      <div className="wage-summary-text">
        <span className="small muted">Lương phải trả cuối ngày</span>
        <strong>
          {total} {BRAND.currency}
        </strong>
        <span className="small muted">
          {today} {BRAND.currency} lương hôm nay
          {owed > 0 ? ` + ${owed} ${BRAND.currency} nợ cũ` : ""} · đang có{" "}
          {state.money} {BRAND.currency}
        </span>
      </div>
      {short > 0 && (
        <p className="notice warn wage-warning" role="status">
          <WarningIcon size={18} />
          Thiếu {short} {BRAND.currency}: bán thêm trước khi đóng cửa, không thì
          cuối ngày sẽ nợ lương.
        </p>
      )}
    </section>
  );
}

/**
 * Tab Nhân sự chia hai mục: Đội ngũ (quầy, lịch ca, từng người) và Tuyển dụng (ứng viên hôm nay).
 * Tuyển dụng tách riêng để không phải cuộn tới cuối danh sách đội mới thấy ứng viên.
 */
export function StaffPanel({ state }: { state: DeepReadonly<SimState> }) {
  const view = useUi((s) => s.staffView);
  const setView = useUi((s) => s.setStaffView);
  const available = state.recruits.filter((r) => r !== null).length;
  const alertCount = staffAlerts(state).length;
  return (
    <div className="panel">
      <Segmented
        label="Mục trong Nhân sự"
        value={view}
        onChange={setView}
        options={[
          {
            id: "team",
            label: "Đội ngũ",
            icon: <StaffIcon />,
            badge: alertCount,
          },
          {
            id: "recruit",
            label: "Tuyển dụng",
            icon: <RecruitIcon />,
            badge: available,
          },
        ]}
      />
      {view === "team" ? (
        <TeamView state={state} />
      ) : (
        <RecruitPanel state={state} />
      )}
    </div>
  );
}

function TeamView({ state }: { state: DeepReadonly<SimState> }) {
  const { assignCounter } = useServiceActions();
  const setView = useUi((s) => s.setStaffView);
  const team = Object.values(state.workers);
  const staffCount = team.filter((w) => w.controller === "ai").length;
  const limits = staffLimits(state);
  const counterOf = (workerId: string) =>
    state.counters.findIndex((c) => c.operatorId === workerId);

  return (
    <>
      <PanelHeading description="Chạm một người trong ô quầy để giao quầy. Mỗi nhân viên thường làm một ca; ca còn lại cần người khác. Chữ dưới chân dung là hạng năng lực S/A/B/C.">
        Đội ngũ
      </PanelHeading>
      <WageSummary state={state} />
      <StaffAlertBox state={state} />

      {state.counters.map((counter) => (
        <CounterCard key={counter.id} state={state} counterId={counter.id} />
      ))}

      <CounterPolicy state={state} />
      <ShiftCoverage state={state} />
      <StationSummary state={state} />

      <h3>
        Đội ngũ{" "}
        <span className="muted small">
          ({staffCount}/{limits.total} nhân viên · {limits.perShift} người mỗi
          ca)
        </span>
      </h3>
      <StaffCapacityHint state={state} full={staffCount >= limits.total} />
      {staffCount < limits.total && (
        <GameButton
          size="small"
          tone="secondary"
          className="team-recruit-link"
          onClick={() => setView("recruit")}
        >
          Còn {limits.total - staffCount} chỗ trống · Xem ứng viên hôm nay
        </GameButton>
      )}
      <ul className="card-list team-list">
        {team.map((w) => (
          <li
            key={w.id}
            id={`team-card-${w.id}`}
            className={`staff-card team-card ${counterOf(w.id) >= 0 ? "on-counter" : ""} ${w.controller === "ai" ? `grade-border-${gradeOf(w)?.grade ?? "C"}` : ""}`}
          >
            <div className="team-card-head">
              <StaffAvatar worker={w} size={48} />
              <div className="team-card-identity">
                <strong className={nameClassOf(w)}>{w.name}</strong>
                <span className="team-card-sub">
                  <span className="small muted">{ROLE[w.role]}</span>
                  <ActivityBadge state={state} worker={w} />
                </span>
              </div>
              {counterOf(w.id) >= 0 && (
                <span className="tag mint">Quầy {counterOf(w.id) + 1}</span>
              )}
              {w.restDay === state.day ? (
                <span className="tag leave-tag">Đang nghỉ phép</span>
              ) : (
                w.restDay === state.day + 1 && (
                  <span className="tag leave-tag">Nghỉ phép mai</span>
                )
              )}
            </div>
            {w.controller === "ai" && (
              <div className="team-card-tags">
                <TraitTags traits={w.traits} hidden={w.hiddenTraits.length} />
                <ReviewTraits state={state} worker={w} />
              </div>
            )}
            {w.controller === "player" && <ReviewTraits state={state} worker={w} />}
            {w.controller === "ai" && <WorkerMeters state={state} worker={w} />}
            {w.resigning && <ResignNotice worker={w} />}
            <dl className="team-card-metrics" aria-label={`Thống kê của ${w.name}`}>
              <div>
                <dt>Đã bán</dt>
                <dd>{w.served}</dd>
              </div>
              <div>
                <dt>Nghiệp vụ</dt>
                <dd>
                  {w.perfCount ? Math.round(w.perfSum / w.perfCount) : "—"}
                </dd>
              </div>
              <div>
                <dt>Đánh giá</dt>
                <dd>
                  {w.repCount
                    ? `${(w.repStarsSum / w.repCount).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}★`
                    : "—"}
                </dd>
              </div>
            </dl>
            {w.controller === "ai" && (
              <div className="team-card-rows">
                <details className="team-card-details">
                  <summary>
                    <span>Lịch ca</span>
                    <b>{w.shifts.map((s) => SHIFT_LABEL[s]).join(", ")}</b>
                  </summary>
                  <ShiftToggle state={state} worker={w} />
                </details>
                <details className="team-card-details">
                  <summary>
                    <span>Vị trí</span>
                    <b>
                      {STATIONS[stationOf(state, w)].name}
                      {counterOf(w.id) >= 0 ? ` ${counterOf(w.id) + 1}` : ""}
                    </b>
                  </summary>
                  <StationPicker state={state} worker={w} />
                </details>
                <details className="team-card-details">
                  <summary>
                    <span>Kỹ năng &amp; lương</span>
                    <b>
                      {w.wage} {BRAND.currency}/ca
                    </b>
                  </summary>
                  <TraitDetails traits={w.traits} />
                  <StatBars
                    speed={w.speed}
                    knowledge={w.knowledge}
                    communication={w.communication}
                  />
                  <WageLine worker={w} />
                  {!w.resigning && <DismissButton worker={w} />}
                </details>
              </div>
            )}
            {(w.controller === "ai"
              ? w.restDay !== state.day && !w.resigning
              : counterOf(w.id) < 0) && (
              <div className="team-card-actions">
                {w.controller === "player" ? (
                  state.counters.map((c, i) => (
                    <GameButton
                      key={c.id}
                      size="small"
                      onClick={() => assignCounter(w.id, c.id)}
                    >
                      Tự đứng quầy {state.counters.length > 1 ? i + 1 : ""}
                    </GameButton>
                  ))
                ) : (
                  <RestToggle state={state} worker={w} />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {staffCount > 0 && (
        <p className="staff-pay-note">
          Tổng lương theo lịch{" "}
          <b>
            {dailyWages(state)} {BRAND.currency}/ngày
          </b>
          . Cuối ngày trả theo số ca mỗi người đã vào làm. Làm cả hai ca, hoặc
          làm {state.config.streakFatigueDays} ngày liền không nghỉ, sẽ mệt và
          có thể xin nghỉ.
        </p>
      )}
    </>
  );
}

/** Đội tăng theo nâng cấp tiệm: chỉ ra nâng cấp kế tiếp mở thêm chỗ, để người chơi biết đường tự động hoá. */
function StaffCapacityHint({
  state,
  full,
}: {
  state: DeepReadonly<SimState>;
  full: boolean;
}) {
  const setTab = useUi((s) => s.setTab);
  const nextId = nextStaffUpgrade(state);
  const next = nextId ? UPGRADES[nextId] : undefined;
  if (!next)
    return (
      <p className="small muted staff-capacity">
        Đội đã đạt quy mô tối đa của tiệm.
      </p>
    );
  const perShift = next.effects.some(
    (e) => e.type === "staff" && e.perShift > 0,
  );
  const label =
    next.id === "counter-2"
      ? next.name
      : `${next.name} cấp ${next.id.split("-")[1]}`;
  return (
    <p className={`small staff-capacity ${full ? "full" : "muted"}`}>
      {full ? "Đội đã đủ chỗ. " : ""}
      {label} thêm {perShift ? "1 chỗ mỗi ca" : "1 người dự phòng"}.{" "}
      <GameButton
        tone="quiet"
        surface="flat"
        size="small"
        type="button"
        className="link-btn"
        onClick={() => setTab("expansion")}
      >
        Mở rộng
      </GameButton>
    </p>
  );
}

/** Tuỳ chọn: bật thì lúc đổi ca, quầy bạn đang giữ không tự giao cho nhân viên. */
function CounterPolicy({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const keep = state.keepCounterOnShiftChange;
  return (
    <label className="policy-toggle">
      <input
        type="checkbox"
        checked={keep}
        onChange={() =>
          bridge.dispatch({
            type: "setCounterPolicy",
            keepOnShiftChange: !keep,
          })
        }
      />
      <span>
        <b>Giữ quầy khi đổi ca</b>
        <span className="small muted">
          {keep
            ? "Bạn đang tự bán: quầy không tự chuyển cho nhân viên."
            : "Đầu mỗi ca, nhân viên trong ca tự nhận quầy."}
        </span>
      </span>
    </label>
  );
}

/** Số ngày làm liên tục và lịch nghỉ: làm liên tục lâu sẽ mệt thêm mỗi ngày. */
/** Khung cảnh báo đầu Đội ngũ: ai xin thôi việc, ai mệt nặng — chạm để tới thẻ, hoặc xếp nghỉ phép ngay. */
function StaffAlertBox({ state }: { state: DeepReadonly<SimState> }) {
  const alerts = staffAlerts(state);
  if (alerts.length === 0) return null;
  const urgent = alerts.some((a) => a.kind === "resigning");
  return (
    <section
      className={`staff-alerts ${urgent ? "urgent" : ""}`}
      role={urgent ? "alert" : "status"}
      aria-label="Nhân viên cần chú ý"
    >
      <strong className="staff-alerts-title">
        <WarningIcon size={18} /> {alerts.length} nhân viên cần chú ý
      </strong>
      <ul>
        {alerts.map(({ worker, kind, text }) => (
          <li key={worker.id} className={`staff-alert ${kind}`}>
            <StaffAvatar worker={worker} size={32} badge="sm" staticBadge />
            <button
              type="button"
              className="staff-alert-text"
              onClick={() =>
                document
                  .getElementById(`team-card-${worker.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <b className={nameClassOf(worker)}>{worker.name}</b>
              <span>{text}</span>
            </button>
            {kind === "tired" && <RestToggle state={state} worker={worker} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Cấp tay nghề và độ mệt đặt cạnh nhau; chuỗi ngày làm liền hiện ngay dưới thanh mệt khi cần chú ý. */
function WorkerMeters({
  state,
  worker,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
}) {
  const limit = state.config.streakFatigueDays;
  // Ngắn gọn dưới thanh mệt; giải thích đầy đủ nằm ở title khi rê chuột.
  const streakNote =
    worker.streak >= limit
      ? `Làm ${worker.streak} ngày liền`
      : worker.streak >= limit - 1
        ? "Nên cho nghỉ"
        : null;
  return (
    <div className="team-card-meters">
      <LevelBar worker={worker} />
      <div className="meter-stack">
        <FatigueBar worker={worker} />
        {streakNote && (
          <span
            className="small neg"
            title={`Làm liên tục ${worker.streak} ngày; từ ngày thứ ${limit} mệt thêm mỗi ngày.`}
          >
            {streakNote}
          </span>
        )}
      </div>
    </div>
  );
}

/** Nút xếp nghỉ phép ngày mai (bật/tắt); khác "Cho thôi việc". */
function RestToggle({
  state,
  worker,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const tomorrow = worker.restDay === state.day + 1;
  const toggle = () => {
    const r = bridge.dispatch({
      type: "setRestDay",
      workerId: worker.id,
      rest: !tomorrow,
    });
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
    else
      pushToast(
        tomorrow ? "info" : "good",
        tomorrow
          ? `Đã huỷ nghỉ phép ngày mai của ${worker.name}.`
          : `${worker.name} nghỉ phép ngày mai — vẫn trong đội, nghỉ cho đỡ mệt rồi đi làm lại.`,
      );
  };
  return (
    <GameButton
      size="small"
      tone={tomorrow ? "primary" : "secondary"}
      aria-pressed={tomorrow}
      onClick={toggle}
    >
      {tomorrow ? "✓ Nghỉ phép mai · Huỷ" : "Cho nghỉ phép ngày mai"}
    </GameButton>
  );
}

/** Số người ở từng vị trí (liệt kê theo danh mục STATIONS, thêm vị trí mới tự hiện ở đây). */
function StationSummary({ state }: { state: DeepReadonly<SimState> }) {
  return (
    <div className="shift-coverage" aria-label="Số người ở mỗi vị trí">
      {STATION_IDS.map((id) => {
        const cap =
          id === "counter" ? state.counters.length : STATIONS[id].capacity;
        return (
          <span
            key={id}
            className="coverage-chip station-chip"
            title={STATIONS[id].description}
          >
            {STATIONS[id].name}:{" "}
            <b>
              {stationHeadcount(state, id)}
              {cap === null ? "" : `/${cap}`}
            </b>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Chọn vị trí làm việc cho một nhân viên. Nút "Quầy bán" cần người đó đang trong ca; vị trí đủ người thì khoá.
 * Danh sách nút lấy từ STATIONS nên thêm vị trí mới không phải sửa giao diện.
 */
function StationPicker({
  state,
  worker,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const current = stationOf(state, worker);
  const assign = (station: StationId, counterId?: string) => {
    const r = counterId
      ? bridge.dispatch({
          type: "assignCounter",
          workerId: worker.id,
          counterId,
        })
      : bridge.dispatch({
          type: "assignStation",
          workerId: worker.id,
          station,
        });
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
  };
  return (
    <div
      className="shift-toggle station-picker"
      role="group"
      aria-label={`Vị trí của ${worker.name}`}
    >
      <span className="small muted">Vị trí:</span>
      {STATION_IDS.map((id) => {
        if (id === "counter")
          return state.counters.map((counter, index) => (
            <GameButton
              surface="custom"
              key={counter.id}
              aria-pressed={counter.operatorId === worker.id}
              disabled={
                counter.operatorId !== worker.id && !isOnDuty(state, worker)
              }
              onClick={() => assign("counter", counter.id)}
            >
              {state.counters.length > 1
                ? `Quầy ${index + 1}`
                : STATIONS.counter.name}
            </GameButton>
          ));
        const cap = STATIONS[id].capacity;
        const full =
          current !== id &&
          cap !== null &&
          stationHeadcount(state, id, worker.id) >= cap;
        return (
          <GameButton
            surface="custom"
            key={id}
            aria-pressed={current === id}
            disabled={full}
            title={STATIONS[id].description}
            onClick={() => assign(id)}
          >
            {STATIONS[id].name}
            {full ? " (đủ người)" : ""}
          </GameButton>
        );
      })}
    </div>
  );
}

/** Mỗi ca có bao nhiêu nhân viên; ca trống thì bạn phải tự đứng quầy (và tiệm đóng cửa khi bạn vắng mặt). */
function ShiftCoverage({ state }: { state: DeepReadonly<SimState> }) {
  const { perShift } = staffLimits(state);
  return (
    <div className="shift-coverage" aria-label="Số nhân viên mỗi ca">
      {SHIFT_IDS.map((shift) => {
        const count = shiftHeadcount(state, shift);
        const resting = Object.values(state.workers).filter(
          (w) => w.shifts.includes(shift) && w.restDay === state.day,
        ).length;
        const working = count - resting;
        return (
          <span
            key={shift}
            className={`coverage-chip ${working === 0 ? "empty" : ""}`}
          >
            {SHIFT_LABEL[shift]}:{" "}
            <b>
              {count}/{perShift}
            </b>
            {resting > 0 && ` · ${resting} nghỉ hôm nay`}
            {working === 0 && " · thiếu người"}
          </span>
        );
      })}
    </div>
  );
}

/** Lịch ca của một NPC: bật/tắt từng ca, luôn giữ ít nhất một ca; ca đã đủ người thì không thêm được. */
function ShiftToggle({
  state,
  worker,
}: {
  state: DeepReadonly<SimState>;
  worker: DeepReadonly<Worker>;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const { perShift } = staffLimits(state);
  const toggle = (shift: ShiftId) => {
    const has = worker.shifts.includes(shift);
    const next = has
      ? worker.shifts.filter((s) => s !== shift)
      : [...worker.shifts, shift];
    const r = bridge.dispatch({
      type: "setShifts",
      workerId: worker.id,
      shifts: next,
    });
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
    else if (!has && next.length === 2 && !worker.traits.includes("ironman")) {
      pushToast(
        "warn",
        `${worker.name} sẽ làm cả hai ca: mỗi ngày như vậy sẽ mệt thêm và có thể xin nghỉ.`,
      );
    }
  };
  return (
    <div
      className="shift-toggle"
      role="group"
      aria-label={`Lịch ca của ${worker.name}`}
    >
      <span className="small muted">Lịch ca:</span>
      {SHIFT_IDS.map((shift) => {
        const has = worker.shifts.includes(shift);
        const full = !has && shiftHeadcount(state, shift) >= perShift;
        return (
          <GameButton
            surface="custom"
            key={shift}
            aria-pressed={has}
            disabled={(has && worker.shifts.length === 1) || full}
            onClick={() => toggle(shift)}
          >
            {SHIFT_LABEL[shift]}
            {currentShift(state) === shift && worker.shiftsToday.includes(shift)
              ? " ✓"
              : ""}
            {full ? " (đủ người)" : ""}
          </GameButton>
        );
      })}
    </div>
  );
}

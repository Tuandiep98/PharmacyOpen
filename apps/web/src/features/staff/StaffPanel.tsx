import {
  currentShift,
  dailyWages,
  isOnDuty,
  LEVEL_XP,
  MAX_LEVEL,
  PLAYER_WORKER_ID,
  QUIT_FATIGUE,
  RARITIES,
  retainWage,
  SHIFT_IDS,
  shiftHeadcount,
  stationHeadcount,
  stationOf,
  STATION_IDS,
  STATIONS,
  TRAITS,
  type DeepReadonly,
  type StationId,
  type Rarity,
  type Recruit,
  type ShiftId,
  type SimState,
  type TraitId,
  type Worker,
} from '@pharmacy/simulation';
import { SHIFT_LABEL } from '../day/dayText';
import { StaffFigure } from '../../art/Character';
import { WorkerPortrait } from '../../art/WorkerFigure';
import { BRAND } from '../../brand';
import { useBridge } from '../../game/useGame';
import { useUi } from '../../ui/uiStore';
import { GameButton, PanelHeading, EmptyState } from '../../ui/primitives';
import { PadlockIcon, StaffIcon, WarningIcon } from '../../art/Icons';
import { REJECT_TEXT } from '../store/rejectText';
import { useServiceActions } from '../store/useServiceActions';
import { DismissButton } from './DismissButton';
import { workerProgress, workerStatus } from './workerStatus';
import './staff.css';

const ROLE: Record<string, string> = { pharmacist: 'Dược sĩ', clerk: 'Nhân viên bán hàng' };

export { workerStatus } from './workerStatus';

export function StatBars({ speed, knowledge, communication }: { speed: number; knowledge: number; communication: number }) {
  // speed là hệ số quanh 1; quy về 0..1 để vẽ (0.5 → 0, 1.5 → 1).
  const rows = [
    { label: 'Tốc độ', value: Math.max(0, Math.min(1, speed - 0.5)) },
    { label: 'Hiểu sản phẩm', value: knowledge },
    { label: 'Giao tiếp', value: communication },
  ];
  return (
    <dl className="stat-bars">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>
            <span className="stat-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.value * 100)} aria-label={r.label}>
              <span style={{ width: `${r.value * 100}%` }} />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Nhãn độ hiếm, tô màu theo bậc (xám → xanh lá → xanh dương → vàng). */
export function RarityChip({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity-chip rarity-${rarity}`}>{RARITIES[rarity].name}</span>;
}

/** Đặc điểm tô màu theo loại: xanh có lợi, đỏ có hại, vàng vừa lợi vừa hại; đặc điểm ẩn hiện "???". */
export function TraitTags({ traits, hidden }: { traits: readonly TraitId[]; hidden: number }) {
  if (traits.length === 0 && hidden === 0) return <span className="small muted">Không có đặc điểm nổi bật</span>;
  return (
    <span className="trait-tags">
      {traits.map((id) => (
        <span key={id} className={`tag trait tone-${TRAITS[id].tone}`} title={TRAITS[id].description}>
          {TRAITS[id].name}
        </span>
      ))}
      {Array.from({ length: hidden }, (_, i) => (
        <span key={`hidden-${i}`} className="tag trait tone-hidden" title="Đặc điểm ẩn: lộ ra sau ca làm đầu tiên.">
          ???
        </span>
      ))}
    </span>
  );
}

/** Mô tả đầy đủ các đặc điểm đã biết, cho phần mở rộng của thẻ. */
function TraitDetails({ traits }: { traits: readonly TraitId[] }) {
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
      Nghiệp vụ: <b>{worker.perfCount ? `${Math.round(worker.perfSum / worker.perfCount)}/100` : '—'}</b>
      {' · '}Đánh giá cá nhân:{' '}
      <b>{worker.repCount ? `${(worker.repStarsSum / worker.repCount).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}★ (${worker.repCount})` : '—'}</b>
    </span>
  );
}

/** Lương và nợ lương của một nhân viên NPC. */
export function WageLine({ worker }: { worker: DeepReadonly<Worker> }) {
  if (worker.controller !== 'ai') return null;
  return (
    <span className="small">
      Lương {worker.wage} {BRAND.currency}/ca · {worker.wage * worker.shifts.length} {BRAND.currency}/ngày theo lịch
      {worker.wageOwed > 0 && <b className="neg"> · đang nợ {worker.wageOwed} — làm chậm hơn</b>}
    </span>
  );
}

/** Cấp tay nghề và kinh nghiệm tới cấp sau. */
export function LevelBar({ worker }: { worker: DeepReadonly<Worker> }) {
  const floor = LEVEL_XP[worker.level - 1] ?? 0;
  const next = LEVEL_XP[worker.level];
  const ratio = next === undefined ? 1 : Math.max(0, Math.min(1, (worker.xp - floor) / (next - floor)));
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
      <span className="small muted">{worker.level >= MAX_LEVEL ? 'Tối đa' : `${worker.xp - floor}/${(next ?? floor) - floor}`}</span>
    </span>
  );
}

/** Thanh mệt: xanh → vàng → đỏ; chạm đỉnh thì người đó xin thôi việc. */
function FatigueBar({ worker }: { worker: DeepReadonly<Worker> }) {
  const ratio = Math.max(0, Math.min(1, worker.fatigue / QUIT_FATIGUE));
  const level = ratio >= 0.7 ? 'high' : ratio >= 0.35 ? 'mid' : 'low';
  return (
    <span className="meter-line">
      <b className="small">Mệt</b>
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
    const r = bridge.dispatch({ type: 'retainStaff', workerId: worker.id });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };
  return (
    <div className="notice bad resign-notice" role="alert">
      <WarningIcon size={18} />
      <span>{worker.name} xin thôi việc vì làm quá sức. Hết hôm nay chưa giữ chân thì sẽ nghỉ hẳn.</span>
      <div className="resign-actions">
        <GameButton size="small" tone="primary" onClick={retain}>
          Tăng lương giữ chân · {worker.wage} → {retainWage(worker.wage)} {BRAND.currency}/ca
        </GameButton>
        <DismissButton worker={worker} />
      </div>
    </div>
  );
}

export function StaffPanel({ state }: { state: DeepReadonly<SimState> }) {
  const { assignCounter } = useServiceActions();
  const team = Object.values(state.workers);
  const staffCount = team.filter((w) => w.controller === 'ai').length;
  const counterOf = (workerId: string) => state.counters.findIndex((c) => c.operatorId === workerId);

  return (
    <div className="panel">
      <PanelHeading description="Mỗi nhân viên thường làm một ca; ca còn lại cần người khác.">Nhân sự</PanelHeading>

      {state.counters.map((counter, index) => {
        const operator = counter.operatorId ? state.workers[counter.operatorId] : undefined;
        const progress = operator ? workerProgress(state, operator) : null;
        return <section key={counter.id} className="counter-summary" aria-label={`Trạng thái quầy ${index + 1}`}>
          <div className="counter-summary-head">
            <span className="counter-summary-label">Quầy {index + 1}</span>
            <span className="small muted">{counter.customerId ? 'Đang có khách' : !operator ? 'Chưa có người đứng' : `${state.queue.length} khách đang chờ`}</span>
          </div>
          <div className="counter-summary-main">
            {operator && <WorkerPortrait worker={operator} size={48} />}
            <div className="counter-summary-text">
              <strong>{operator ? `${operator.name}${operator.id === PLAYER_WORKER_ID ? ' (bạn)' : ''}` : 'Quầy chưa mở'}</strong>
              <span>{operator ? workerStatus(state, operator) : 'Chọn người đứng quầy trong khay phục vụ.'}</span>
            </div>
            {operator?.id !== PLAYER_WORKER_ID && <GameButton size="small" onClick={() => assignCounter(PLAYER_WORKER_ID, counter.id)}>Tự đứng quầy</GameButton>}
          </div>
          {!operator && team.filter((w) => w.controller === 'ai' && isOnDuty(state, w) && counterOf(w.id) < 0).map((w) => <GameButton key={w.id} size="small" onClick={() => assignCounter(w.id, counter.id)}>Giao cho {w.name}</GameButton>)}
          {progress !== null && <span className="progress-track" role="progressbar" aria-label={`Tiến độ công việc của ${operator?.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span className="progress-fill" style={{ width: `${progress * 100}%` }} /></span>}
        </section>;
      })}

      <CounterPolicy state={state} />
      <ShiftCoverage state={state} />
      <StationSummary state={state} />

      <h3>
        Đội ngũ{' '}
        <span className="muted small">
          ({staffCount}/{state.config.maxStaff} nhân viên)
        </span>
      </h3>
      <ul className="card-list team-list">
        {team.map((w) => (
          <li
            key={w.id}
            className={`staff-card team-card ${counterOf(w.id) >= 0 ? 'on-counter' : ''} ${w.controller === 'ai' ? `rarity-border-${w.rarity}` : ''}`}
          >
            <div className="team-card-head">
              <WorkerPortrait worker={w} size={48} />
              <div className="team-card-identity">
                <strong>
                  {w.name} {w.id === PLAYER_WORKER_ID && <span className="tag">bạn</span>}
                </strong>
                <span className="small muted">
                  {ROLE[w.role]} {w.controller === 'ai' && <RarityChip rarity={w.rarity} />}
                </span>
              </div>
              {counterOf(w.id) >= 0 && <span className="tag mint">Quầy {counterOf(w.id) + 1}</span>}
              {w.restDay === state.day ? (
                <span className="tag off-duty">Nghỉ hôm nay</span>
              ) : (
                !isOnDuty(state, w) && <span className="tag off-duty">Ngoài ca</span>
              )}
            </div>
            <p className="team-card-status">
              <span className="status-dot" aria-hidden />
              {workerStatus(state, w)}
            </p>
            {w.controller === 'ai' && (
              <>
                <TraitTags traits={w.traits} hidden={w.hiddenTraits.length} />
                <LevelBar worker={w} />
                <FatigueBar worker={w} />
                <RestLine state={state} worker={w} />
                {w.resigning && <ResignNotice worker={w} />}
              </>
            )}
            <div className="team-card-metrics" aria-label={`Thống kê của ${w.name}`}>
              <span>
                Đã bán <b>{w.served}</b>
              </span>
              <span>
                Nghiệp vụ <b>{w.perfCount ? `${Math.round(w.perfSum / w.perfCount)}/100` : '—'}</b>
              </span>
              <span>
                Đánh giá{' '}
                <b>{w.repCount ? `${(w.repStarsSum / w.repCount).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}★` : '—'}</b>
              </span>
            </div>
            {w.controller === 'ai' && <details className="team-card-details"><summary>Lịch ca · {w.shifts.map((s) => SHIFT_LABEL[s]).join(', ')}</summary><ShiftToggle state={state} worker={w} /></details>}
            {w.controller === 'ai' && <details className="team-card-details"><summary>Vị trí · {STATIONS[stationOf(state, w)].name}{counterOf(w.id) >= 0 ? ` ${counterOf(w.id) + 1}` : ''}</summary><StationPicker state={state} worker={w} /></details>}
            <div className="team-card-actions">
              {w.controller === 'player' && counterOf(w.id) < 0 && state.counters.map((c, i) => (
                <GameButton key={c.id} size="small" onClick={() => assignCounter(w.id, c.id)}>
                  Tự đứng quầy {state.counters.length > 1 ? i + 1 : ''}
                </GameButton>
              ))}
              {w.controller === 'ai' && (
                <details className="team-card-details">
                  <summary>Kỹ năng &amp; lương</summary>
                  <TraitDetails traits={w.traits} />
                  <StatBars speed={w.speed} knowledge={w.knowledge} communication={w.communication} />
                  <WageLine worker={w} />
                  {!w.resigning && <DismissButton worker={w} />}
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>

      {staffCount > 0 && (
        <p className="staff-pay-note">
          Tổng lương theo lịch{' '}
          <b>
            {dailyWages(state)} {BRAND.currency}/ngày
          </b>
          . Cuối ngày trả theo số ca mỗi người đã vào làm. Làm cả hai ca, hoặc làm {state.config.streakFatigueDays} ngày liền không nghỉ, sẽ mệt và có thể xin nghỉ.
        </p>
      )}

      <RecruitList state={state} full={staffCount >= state.config.maxStaff} />
    </div>
  );
}

/** Tuỳ chọn: bật thì lúc đổi ca, quầy bạn đang giữ không tự giao cho nhân viên. */
function CounterPolicy({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const keep = state.keepCounterOnShiftChange;
  return (
    <label className="policy-toggle">
      <input type="checkbox" checked={keep} onChange={() => bridge.dispatch({ type: 'setCounterPolicy', keepOnShiftChange: !keep })} />
      <span>
        <b>Giữ quầy khi đổi ca</b>
        <span className="small muted">
          {keep ? 'Bạn đang tự bán: quầy không tự chuyển cho nhân viên.' : 'Đầu mỗi ca, nhân viên trong ca tự nhận quầy.'}
        </span>
      </span>
    </label>
  );
}

/** Số ngày làm liên tục và lịch nghỉ: làm liên tục lâu sẽ mệt thêm mỗi ngày. */
function RestLine({ state, worker }: { state: DeepReadonly<SimState>; worker: DeepReadonly<Worker> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const limit = state.config.streakFatigueDays;
  const tomorrow = worker.restDay === state.day + 1;
  const toggle = () => {
    const r = bridge.dispatch({ type: 'setRestDay', workerId: worker.id, rest: !tomorrow });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };
  return (
    <span className="rest-line">
      <span className={`small ${worker.streak >= limit - 1 ? 'neg' : 'muted'}`}>
        Làm liên tục {worker.streak} ngày{worker.streak >= limit ? ' · đang mệt thêm mỗi ngày' : worker.streak >= limit - 1 ? ' · nên cho nghỉ' : ''}
      </span>
      {worker.restDay !== state.day && (
        <GameButton size="small" tone={tomorrow ? 'primary' : 'secondary'} aria-pressed={tomorrow} onClick={toggle}>
          {tomorrow ? 'Mai nghỉ · huỷ' : 'Cho nghỉ ngày mai'}
        </GameButton>
      )}
    </span>
  );
}

/** Số người ở từng vị trí (liệt kê theo danh mục STATIONS, thêm vị trí mới tự hiện ở đây). */
function StationSummary({ state }: { state: DeepReadonly<SimState> }) {
  return (
    <div className="shift-coverage" aria-label="Số người ở mỗi vị trí">
      {STATION_IDS.map((id) => {
        const cap = id === 'counter' ? state.counters.length : STATIONS[id].capacity;
        return (
          <span key={id} className="coverage-chip station-chip" title={STATIONS[id].description}>
            {STATIONS[id].name}:{' '}
            <b>
              {stationHeadcount(state, id)}
              {cap === null ? '' : `/${cap}`}
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
function StationPicker({ state, worker }: { state: DeepReadonly<SimState>; worker: DeepReadonly<Worker> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const current = stationOf(state, worker);
  const assign = (station: StationId, counterId?: string) => {
    const r = counterId
      ? bridge.dispatch({ type: 'assignCounter', workerId: worker.id, counterId })
      : bridge.dispatch({ type: 'assignStation', workerId: worker.id, station });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };
  return (
    <div className="shift-toggle station-picker" role="group" aria-label={`Vị trí của ${worker.name}`}>
      <span className="small muted">Vị trí:</span>
      {STATION_IDS.map((id) => {
        if (id === 'counter') return state.counters.map((counter, index) => (
          <button key={counter.id} aria-pressed={counter.operatorId === worker.id} disabled={counter.operatorId !== worker.id && !isOnDuty(state, worker)} onClick={() => assign('counter', counter.id)}>
            {state.counters.length > 1 ? `Quầy ${index + 1}` : STATIONS.counter.name}
          </button>
        ));
        const cap = STATIONS[id].capacity;
        const full = current !== id && cap !== null && stationHeadcount(state, id, worker.id) >= cap;
        return (
          <button
            key={id}
            aria-pressed={current === id}
            disabled={full}
            title={STATIONS[id].description}
            onClick={() => assign(id)}
          >
            {STATIONS[id].name}
            {full ? ' (đủ người)' : ''}
          </button>
        );
      })}
    </div>
  );
}

/** Mỗi ca có bao nhiêu nhân viên; ca trống thì bạn phải tự đứng quầy (và tiệm đóng cửa khi bạn vắng mặt). */
function ShiftCoverage({ state }: { state: DeepReadonly<SimState> }) {
  return (
    <div className="shift-coverage" aria-label="Số nhân viên mỗi ca">
      {SHIFT_IDS.map((shift) => {
        const count = shiftHeadcount(state, shift);
        const resting = Object.values(state.workers).filter((w) => w.shifts.includes(shift) && w.restDay === state.day).length;
        const working = count - resting;
        return (
          <span key={shift} className={`coverage-chip ${working === 0 ? 'empty' : ''}`}>
            {SHIFT_LABEL[shift]}:{' '}
            <b>
              {count}/{state.config.maxPerShift}
            </b>
            {resting > 0 && ` · ${resting} nghỉ hôm nay`}
            {working === 0 && ' · thiếu người'}
          </span>
        );
      })}
    </div>
  );
}

/** Lịch ca của một NPC: bật/tắt từng ca, luôn giữ ít nhất một ca; ca đã đủ người thì không thêm được. */
function ShiftToggle({ state, worker }: { state: DeepReadonly<SimState>; worker: DeepReadonly<Worker> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const toggle = (shift: ShiftId) => {
    const has = worker.shifts.includes(shift);
    const next = has ? worker.shifts.filter((s) => s !== shift) : [...worker.shifts, shift];
    const r = bridge.dispatch({ type: 'setShifts', workerId: worker.id, shifts: next });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
    else if (!has && next.length === 2 && !worker.traits.includes('ironman')) {
      pushToast('warn', `${worker.name} sẽ làm cả hai ca: mỗi ngày như vậy sẽ mệt thêm và có thể xin nghỉ.`);
    }
  };
  return (
    <div className="shift-toggle" role="group" aria-label={`Lịch ca của ${worker.name}`}>
      <span className="small muted">Lịch ca:</span>
      {SHIFT_IDS.map((shift) => {
        const has = worker.shifts.includes(shift);
        const full = !has && shiftHeadcount(state, shift) >= state.config.maxPerShift;
        return (
          <button key={shift} aria-pressed={has} disabled={(has && worker.shifts.length === 1) || full} onClick={() => toggle(shift)}>
            {SHIFT_LABEL[shift]}
            {currentShift(state) === shift && worker.shiftsToday.includes(shift) ? ' ✓' : ''}
            {full ? ' (đủ người)' : ''}
          </button>
        );
      })}
    </div>
  );
}

/** Ứng viên hôm nay: 3 người ngẫu nhiên, khoá để giữ sang ngày sau, làm mới có trả phí mỗi ngày một lần. */
function RecruitList({ state, full }: { state: DeepReadonly<SimState>; full: boolean }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const rerolled = state.recruitRerollDay === state.day;
  const cost = state.config.recruitRerollCost;
  return (
    <section aria-label="Ứng viên hôm nay">
      <div className="recruit-head">
        <h3>
          Ứng viên hôm nay <span className="muted small">(đổi mới mỗi sáng, ô khoá được giữ lại)</span>
        </h3>
        <GameButton
          size="small"
          disabled={rerolled || state.money < cost}
          onClick={() => {
            const r = bridge.dispatch({ type: 'rerollRecruits' });
            if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
          }}
        >
          {rerolled ? 'Đã làm mới hôm nay' : `Làm mới · ${cost} ${BRAND.currency}`}
        </GameButton>
      </div>
      {state.recruits.every((r) => r === null) ? (
        <EmptyState icon={<StaffIcon />} title="Đã tuyển hết ứng viên hôm nay">
          Sáng mai sẽ có ứng viên mới.
        </EmptyState>
      ) : (
        <ul className="card-list recruit-list">
          {state.recruits.map((recruit, slot) =>
            recruit ? <RecruitCard key={recruit.id} state={state} recruit={recruit} slot={slot} full={full} /> : null,
          )}
        </ul>
      )}
    </section>
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
  const affordable = state.money >= recruit.hireCost;
  const run = (command: Parameters<typeof bridge.dispatch>[0]) => {
    const r = bridge.dispatch(command);
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };
  return (
    <li className={`staff-card recruit-card rarity-border-${recruit.rarity}`}>
      <div className="recruit-top">
        <svg width={56} height={56} viewBox="-34 -112 68 68" aria-hidden>
          <circle cx={0} cy={-78} r={33} fill={recruit.role === 'pharmacist' ? '#DCEFE3' : '#F8ECD6'} />
          <StaffFigure look={recruit.look} role={recruit.role} expression="happy" />
        </svg>
        <div className="staff-info">
          <strong>{recruit.name}</strong>
          <span className="small muted">
            {ROLE[recruit.role]} <RarityChip rarity={recruit.rarity} />
          </span>
          <span className="small muted">{recruit.blurb}</span>
        </div>
        <button
          className={`lock-btn ${recruit.locked ? 'locked' : ''}`}
          aria-pressed={recruit.locked}
          aria-label={recruit.locked ? `Bỏ khoá ${recruit.name}` : `Khoá ${recruit.name} để giữ sang ngày sau`}
          onClick={() => run({ type: 'lockRecruit', slot, locked: !recruit.locked })}
        >
          <PadlockIcon open={!recruit.locked} size={22} />
        </button>
      </div>
      <TraitTags traits={recruit.traits} hidden={recruit.hiddenTraits.length} />
      {recruit.hiddenTraits.length > 0 && (
        <GameButton size="small" disabled={state.money < state.config.interviewCost} onClick={() => run({ type: 'interviewRecruit', slot })}>
          Phỏng vấn để biết &quot;???&quot; · {state.config.interviewCost} {BRAND.currency}
        </GameButton>
      )}
      <StatBars speed={recruit.speed} knowledge={recruit.knowledge} communication={recruit.communication} />
      <span className="small">
        Lương {recruit.wage} {BRAND.currency}/ca
      </span>
      <GameButton tone="primary" size="small" disabled={full || !affordable} onClick={() => run({ type: 'hire', candidateId: recruit.id })}>
        {full ? 'Đội đã đủ người' : `Tuyển · ${recruit.hireCost} ${BRAND.currency}`}
      </GameButton>
      <TraitDetails traits={recruit.traits} />
    </li>
  );
}

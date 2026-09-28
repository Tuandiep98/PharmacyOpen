import {
  dailyWages,
  PLAYER_WORKER_ID,
  STAFF_CANDIDATE_IDS,
  STAFF_CANDIDATES,
  TRAITS,
  type TraitId,
  type DeepReadonly,
  type SimState,
  type StaffCandidateDef,
  type Worker,
} from '@pharmacy/simulation';
import { StaffFigure } from '../../art/Character';
import { WorkerPortrait } from '../../art/WorkerFigure';
import { BRAND } from '../../brand';
import { useBridge } from '../../game/useGame';
import { useUi } from '../../ui/uiStore';
import { GameButton, PanelHeading, EmptyState } from '../../ui/primitives';
import { StaffIcon } from '../../art/Icons';
import { REJECT_TEXT } from '../store/rejectText';
import { useServiceActions } from '../store/useServiceActions';
import { DismissButton } from './DismissButton';
import { workerProgress, workerStatus } from './workerStatus';

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

export function TraitTag({ trait }: { trait: TraitId | null }) {
  if (!trait) return null;
  return (
    <span className="tag trait" title={TRAITS[trait].description}>
      {TRAITS[trait].name}
    </span>
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
      Lương {worker.wage} {BRAND.currency}/ngày
      {worker.wageOwed > 0 && <b className="neg"> · đang nợ {worker.wageOwed} — làm chậm hơn</b>}
    </span>
  );
}

export function StaffPanel({ state }: { state: DeepReadonly<SimState> }) {
  const { assignCounter } = useServiceActions();
  const team = Object.values(state.workers);
  const staffCount = team.filter((w) => w.controller === 'ai').length;
  const operatorId = state.counters[0]?.operatorId;
  const operator = operatorId ? state.workers[operatorId] : undefined;
  const operatorProgress = operator ? workerProgress(state, operator) : null;
  const candidates = STAFF_CANDIDATE_IDS.filter((id) => !state.workers[`w-${id}`]);

  return (
    <div className="panel">
      <PanelHeading description="Theo dõi quầy, giao việc và quản lý đội ngũ.">Nhân sự</PanelHeading>

      {operator && (
        <section className="counter-summary" aria-label="Trạng thái quầy">
          <div className="counter-summary-head">
            <span className="counter-summary-label">Quầy hiện tại</span>
            <span className="small muted">{state.queue.length} khách đang chờ</span>
          </div>
          <div className="counter-summary-main">
            <WorkerPortrait worker={operator} size={48} />
            <div className="counter-summary-text">
              <strong>{operator.name}{operator.id === PLAYER_WORKER_ID ? ' (bạn)' : ''}</strong>
              <span>{workerStatus(state, operator)}</span>
            </div>
            {operator.id !== PLAYER_WORKER_ID && (
              <GameButton size="small" onClick={() => assignCounter(PLAYER_WORKER_ID)}>Tự đứng quầy</GameButton>
            )}
          </div>
          {operatorProgress !== null && (
            <span className="progress-track" role="progressbar" aria-label={`Tiến độ công việc của ${operator.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(operatorProgress * 100)}>
              <span className="progress-fill" style={{ width: `${operatorProgress * 100}%` }} />
            </span>
          )}
        </section>
      )}

      <h3>Đội ngũ <span className="muted small">({team.length})</span></h3>
      <ul className="card-list team-list">
        {team.map((w) => (
          <li key={w.id} className={`staff-card team-card ${operatorId === w.id ? 'on-counter' : ''}`}>
            <div className="team-card-head">
              <WorkerPortrait worker={w} size={48} />
              <div className="team-card-identity">
                <strong>{w.name} {w.id === PLAYER_WORKER_ID && <span className="tag">bạn</span>}</strong>
                <span className="small muted">{ROLE[w.role]}</span>
              </div>
              {operatorId === w.id && <span className="tag mint">Đứng quầy</span>}
            </div>
            <p className="team-card-status"><span className="status-dot" aria-hidden />{workerStatus(state, w)}</p>
            <div className="team-card-metrics" aria-label={`Thống kê của ${w.name}`}>
              <span>Đã bán <b>{w.served}</b></span>
              <span>Nghiệp vụ <b>{w.perfCount ? `${Math.round(w.perfSum / w.perfCount)}/100` : '—'}</b></span>
              <span>Đánh giá <b>{w.repCount ? `${(w.repStarsSum / w.repCount).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}★` : '—'}</b></span>
            </div>
            <div className="team-card-actions">
              {operatorId !== w.id && (
                <GameButton size="small" onClick={() => assignCounter(w.id)}>
                  Giao quầy
                </GameButton>
              )}
              {w.controller === 'ai' && (
                <details className="team-card-details">
                  <summary>Kỹ năng &amp; lương</summary>
                  <TraitTag trait={w.trait} />
                  <StatBars speed={w.speed} knowledge={w.knowledge} communication={w.communication} />
                  <WageLine worker={w} />
                  <DismissButton worker={w} />
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>

      {staffCount > 0 && <p className="staff-pay-note">Tổng lương <b>{dailyWages(state)} {BRAND.currency}/ngày</b>, thanh toán vào cuối ngày.</p>}

      <h3>
        Tuyển thêm <span className="muted small">({staffCount}/{state.config.maxStaff} chỗ)</span>
      </h3>
      {candidates.length === 0 ? (
        <EmptyState icon={<StaffIcon />} title="Đội ngũ đã đủ người">Hiện chưa có thêm ứng viên để tuyển.</EmptyState>
      ) : (
        <ul className="card-list">
          {candidates.map((id) => (
            <CandidateCard key={id} state={state} candidate={STAFF_CANDIDATES[id]!} full={staffCount >= state.config.maxStaff} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CandidateCard({ state, candidate, full }: { state: DeepReadonly<SimState>; candidate: StaffCandidateDef; full: boolean }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const affordable = state.money >= candidate.hireCost;
  return (
    <li className="staff-card candidate-card">
      <svg width={56} height={56} viewBox="-34 -112 68 68" aria-hidden>
        <circle cx={0} cy={-78} r={33} fill="#dcefe3" />
        <StaffFigure look={candidate.look} role={candidate.role} expression="happy" />
      </svg>
      <div className="staff-info">
        <strong>
          {candidate.name}
        </strong>
        <span className="muted small">
          {ROLE[candidate.role]} · {candidate.blurb}
        </span>
        <span className="small">Lương {candidate.wage} {BRAND.currency}/ngày</span>
      </div>
      <GameButton
        tone="primary"
        size="small"
        disabled={full || !affordable}
        onClick={() => {
          const r = bridge.dispatch({ type: 'hire', candidateId: candidate.id });
          if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
        }}
      >
        {full ? 'Hết chỗ' : `Tuyển · ${candidate.hireCost} ${BRAND.currency}`}
      </GameButton>
      <details className="team-card-details candidate-details">
        <summary>Xem kỹ năng</summary>
        <TraitTag trait={candidate.trait} />
        <span className="small muted">{TRAITS[candidate.trait].description}</span>
        <StatBars speed={candidate.speed} knowledge={candidate.knowledge} communication={candidate.communication} />
      </details>
    </li>
  );
}

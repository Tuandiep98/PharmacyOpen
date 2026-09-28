import {
  dailyWages,
  PLAYER_WORKER_ID,
  PRODUCTS,
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

const ROLE: Record<string, string> = { pharmacist: 'Dược sĩ', clerk: 'Nhân viên bán hàng' };

const ORDER_STATUS: Record<string, string> = {
  deciding: 'đang nghe khách',
  retrieving: 'đang lấy hàng',
  ready: 'chờ thanh toán',
  checkingOut: 'đang thanh toán',
  referring: 'đang khuyên khách đi khám',
};

export function workerStatus(state: DeepReadonly<SimState>, worker: DeepReadonly<Worker>): string {
  if (worker.task) return `Đang bổ sung kệ ${PRODUCTS[worker.task.productId].name.toLowerCase()}`;
  const order = worker.orderId ? state.orders[worker.orderId] : undefined;
  if (order) return `Đang phục vụ — ${ORDER_STATUS[order.state] ?? 'bận'}`;
  if (state.counters[0]?.operatorId === worker.id) return 'Đứng quầy, chờ khách';
  return worker.controller === 'ai' ? 'Rảnh — sẽ tự bổ sung kệ khi hàng vơi' : 'Rảnh';
}

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
  const candidates = STAFF_CANDIDATE_IDS.filter((id) => !state.workers[`w-${id}`]);

  return (
    <div className="panel">
      <PanelHeading description={
        <>
        Giao quầy cho nhân viên để tiệm tự chạy khi bạn bận hoặc rời game. Nhân viên rảnh sẽ tự bổ sung kệ. Mọi người đều
        phải theo cùng quy tắc: khách mô tả triệu chứng thì khuyên đi khám.
        </>
      }>Nhân sự</PanelHeading>
      {staffCount > 0 && (
        <p className="small">
          Tổng lương: <b>{dailyWages(state)} {BRAND.currency}/ngày</b>, trả vào cuối mỗi ngày. Thiếu xu thì ghi nợ và nhân viên
          làm chậm lại.
        </p>
      )}

      <h3>Đội ngũ</h3>
      <ul className="card-list">
        {team.map((w) => (
          <li key={w.id} className="staff-card">
            <WorkerPortrait worker={w} size={56} />
            <div className="staff-info">
              <strong>
                {w.name} {w.id === PLAYER_WORKER_ID && <span className="tag">bạn</span>}
                {operatorId === w.id && <span className="tag mint">đứng quầy</span>}
                <TraitTag trait={w.trait} />
              </strong>
              <span className="muted small">
                {ROLE[w.role]} · đã bán {w.served}
              </span>
              <span className="small">{workerStatus(state, w)}</span>
              <WorkerMetrics worker={w} />
              <WageLine worker={w} />
              {w.controller === 'ai' && <StatBars speed={w.speed} knowledge={w.knowledge} communication={w.communication} />}
            </div>
            <div className="staff-actions">
              {operatorId !== w.id && (
                <GameButton size="small" onClick={() => assignCounter(w.id)}>
                  Giao quầy
                </GameButton>
              )}
              <DismissButton worker={w} />
            </div>
          </li>
        ))}
      </ul>

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
    <li className="staff-card">
      <svg width={56} height={56} viewBox="-34 -112 68 68" aria-hidden>
        <circle cx={0} cy={-78} r={33} fill="#dcefe3" />
        <StaffFigure look={candidate.look} role={candidate.role} expression="happy" />
      </svg>
      <div className="staff-info">
        <strong>
          {candidate.name} <TraitTag trait={candidate.trait} />
        </strong>
        <span className="muted small">
          {ROLE[candidate.role]} · {candidate.blurb}
        </span>
        <span className="small muted">{TRAITS[candidate.trait].description}</span>
        <span className="small">
          Lương {candidate.wage} {BRAND.currency}/ngày
        </span>
        <StatBars speed={candidate.speed} knowledge={candidate.knowledge} communication={candidate.communication} />
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
    </li>
  );
}

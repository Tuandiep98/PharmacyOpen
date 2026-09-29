import {
  ARCHETYPES,
  COMPLAINT_RESPONSES,
  demandMultiplier,
  PLAYER_WORKER_ID,
  PRODUCTS,
  REASONS,
  storeRating,
  type ComplaintResponse,
  type DeepReadonly,
  type InteractionRecord,
  type Review,
  type SimState,
} from '@pharmacy/simulation';
import { useState } from 'react';
import { WorkerPortrait } from '../../art/WorkerFigure';
import { BRAND } from '../../brand';
import { useBridge } from '../../game/useGame';
import { formatRating, Stars } from '../../ui/Stars';
import { useUi } from '../../ui/uiStore';
import { EmptyState, GameButton, PanelHeading } from '../../ui/primitives';
import { StarIcon } from '../../art/Icons';
import { REJECT_TEXT } from '../store/rejectText';

type State = DeepReadonly<SimState>;

const RESPONSE_HINT: Record<ComplaintResponse, string> = {
  apologize: 'Hợp khi lỗi thuộc về nhân viên.',
  explain: 'Hợp khi khách chê giá hoặc kỳ vọng quá cao dù phục vụ đúng.',
  voucher: 'Dễ làm khách hài lòng hơn nhưng tốn xu.',
};

const OUTCOME: Record<string, string> = {
  bought: 'Mua hàng',
  referred: 'Được khuyên đi khám',
  'left-angry': 'Bỏ về vì chờ lâu',
  'left-unserved': 'Không mua được gì',
};

function minutesAgo(state: State, atMs: number): string {
  const m = Math.floor((state.timeMs - atMs) / 60_000);
  return m <= 0 ? 'vừa xong' : `${m} phút trước`;
}

const seconds = (ms: number) => `${Math.round(ms / 1000)} giây`;

export function ReviewsPanel({ state }: { state: State }) {
  const rating = storeRating(state);
  const demand = Math.round((demandMultiplier(state) - 1) * 100);
  const { histogram, count } = state.reputation;
  const max = Math.max(1, ...histogram);
  const open = state.complaints.filter((c) => c.status === 'open');
  const reviews = [...state.reviews].reverse().slice(0, 25);

  return (
    <div className="panel reviews-panel">
      <PanelHeading description="Sao công khai, chất lượng phục vụ và phản hồi của tiệm.">Đánh giá</PanelHeading>

      <section className="rating-card">
        <div className="rating-big">
          <b>{formatRating(rating)}</b>
          <Stars value={rating} size={20} />
          <span className="muted small">{count} đánh giá công khai</span>
        </div>
        <ul className="histogram" aria-label="Phân bố số sao">
          {[5, 4, 3, 2, 1].map((s) => (
            <li key={s}>
              <span>{s}★</span>
              <span className="hist-track">
                <span style={{ width: `${((histogram[s - 1] ?? 0) / max) * 100}%` }} />
              </span>
              <span className="muted">{histogram[s - 1] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className={`demand ${demand >= 0 ? 'up' : 'down'}`}>
        Lượng khách ghé: <b>{demand >= 0 ? `+${demand}` : demand}%</b> so với mức bình thường
        <span className="muted small"> (giới hạn −25% … +30%)</span>
      </p>

      <h3>Công khai ≠ nghiệp vụ</h3>
      <p className="muted small">
        Sao công khai là cảm nhận chủ quan của khách. Hiệu suất nghiệp vụ chỉ chấm việc làm đúng: đúng món, đúng quy tắc an
        toàn. Đánh giá thấp vì giá hay vì khách kỳ vọng cao không tính cho nhân viên.
      </p>
      <ul className="card-list">
        {Object.values(state.workers).map((w) => (
          <li key={w.id} className="staff-card">
            <WorkerPortrait worker={w} size={44} />
            <div className="staff-info">
              <strong>{w.name}</strong>
              <MetricRow label="Nghiệp vụ" value={w.perfCount ? w.perfSum / w.perfCount / 100 : null} text={w.perfCount ? `${Math.round(w.perfSum / w.perfCount)}/100 · ${w.perfCount} lượt` : 'chưa có'} />
              <div className="metric-row">
                <span className="metric-label">Cá nhân</span>
                {w.repCount ? (
                  <>
                    <Stars value={w.repStarsSum / w.repCount} size={13} />
                    <span className="small muted">{w.repCount} đánh giá</span>
                  </>
                ) : (
                  <span className="small muted">chưa có</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h3>
        Khiếu nại cần phản hồi <span className="muted small">({open.length})</span>
      </h3>
      <p className="muted small">Khiếu nại chưa xử lý tự đóng sau 2 ngày trong game; đánh giá vẫn được giữ lại.</p>
      {open.length === 0 ? (
        <EmptyState icon={<StarIcon />} title="Hộp thư đã gọn">Chưa có khiếu nại cần phản hồi.</EmptyState>
      ) : (
        <ul className="card-list">
          {open.map((c) => {
            const review = state.reviews.find((r) => r.id === c.reviewId);
            return review ? <ComplaintCard key={c.id} state={state} complaintId={c.id} review={review} /> : null;
          })}
        </ul>
      )}

      <h3>Đánh giá gần đây</h3>
      {reviews.length === 0 ? (
        <EmptyState icon={<StarIcon />} title="Chưa có đánh giá">Sau vài lượt phục vụ, khách có thể viết đánh giá về tiệm.</EmptyState>
      ) : (
        <ul className="card-list">
          {reviews.map((r) => (
            <ReviewCard key={r.id} state={state} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricRow({ label, value, text }: { label: string; value: number | null; text: string }) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      {value !== null && (
        <span className="stat-track perf" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
          <span style={{ width: `${value * 100}%` }} />
        </span>
      )}
      <span className="small muted">{text}</span>
    </div>
  );
}

function ReasonTags({ reasons }: { reasons: readonly (keyof typeof REASONS)[] }) {
  return (
    <span className="reason-tags">
      {reasons.map((r) => (
        <span key={r} className={`reason ${REASONS[r].scope}`}>
          {REASONS[r].label}
        </span>
      ))}
    </span>
  );
}

/** Nhãn độ quen: visits là số lần đã ghé trước, nên lượt được đánh giá là lần thứ visits + 1. */
function familiarityLabel(review: DeepReadonly<Review>): string {
  if (review.familiarity === 'close') return `Khách thân · lần ghé thứ ${review.visits + 1}`;
  if (review.familiarity === 'known') return `Khách quen · lần ghé thứ ${review.visits + 1}`;
  return 'Khách mới';
}

/** Chữ cái đại diện: chữ đầu của tên riêng ("Chị Dung" → D, "Dung N." → D); ẩn danh thì "?". */
function authorInitial(author: string | null): string {
  if (!author) return '?';
  const words = author.split(' ');
  const given = words.length > 1 && /\.$/.test(words[words.length - 1]!) ? words[0]! : words[words.length - 1]!;
  return given.charAt(0).toUpperCase();
}

function ReviewHeader({ state, review }: { state: State; review: DeepReadonly<Review> }) {
  const worker = review.workerId ? state.workers[review.workerId] : undefined;
  return (
    <>
      <div className="review-author">
        <span className={`review-avatar fam-${review.familiarity} ${review.author ? '' : 'anonymous'}`} aria-hidden>
          {authorInitial(review.author)}
        </span>
        <div className="review-byline">
          <strong>{review.author ?? 'Ẩn danh'}</strong>
          <span className="small muted">
            <span className={`fam-badge fam-${review.familiarity}`}>{familiarityLabel(review)}</span> · {ARCHETYPES[review.archetypeId].name} ·{' '}
            {minutesAgo(state, review.atMs)}
          </span>
        </div>
        <Stars value={review.stars} size={15} />
      </div>
      <p className="review-comment">“{review.comment}”</p>
      <ReasonTags reasons={review.reasons} />
      <span className="small muted">
        {worker ? `Phục vụ: ${worker.name}` : 'Chưa được ai phục vụ'}
        {worker && !review.countsForStaff && ' · không tính cho nhân viên (lỗi không thuộc về người phục vụ)'}
      </span>
    </>
  );
}

function ReviewCard({ state, review }: { state: State; review: DeepReadonly<Review> }) {
  const [open, setOpen] = useState(false);
  const interaction = state.interactions.find((i) => i.id === review.interactionId);
  return (
    <li className={`review-card fam-${review.familiarity}`}>
      <ReviewHeader state={state} review={review} />
      {review.response && (
        <span className="small reply">
          Tiệm đã phản hồi: “{COMPLAINT_RESPONSES[review.response].reply}”
          {review.stars > review.originalStars ? ` · khách sửa từ ${review.originalStars}★ lên ${review.stars}★` : ' · khách giữ nguyên đánh giá'}
        </span>
      )}
      {interaction && (
        <button className="link-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Ẩn diễn biến' : 'Xem diễn biến'}
        </button>
      )}
      {open && interaction && <Timeline state={state} interaction={interaction} />}
    </li>
  );
}

/** Diễn biến khách quan của lượt phục vụ, để người chơi hiểu vì sao có đánh giá này. */
function Timeline({ state, interaction: i }: { state: State; interaction: DeepReadonly<InteractionRecord> }) {
  const worker = i.workerId ? state.workers[i.workerId] : undefined;
  return (
    <ol className="timeline">
      <li>Khách vào tiệm.</li>
      {i.servedAtMs !== null ? (
        <li>
          Chờ {seconds(i.servedAtMs - i.arrivedAtMs)} rồi được {i.workerId === PLAYER_WORKER_ID ? 'tôi' : (worker?.name ?? 'nhân viên')} phục vụ.
        </li>
      ) : (
        <li>Chờ {seconds(i.endedAtMs - i.arrivedAtMs)} mà chưa tới lượt.</li>
      )}
      {i.wrongProductIds.map((p, n) => (
        <li key={n}>Đưa nhầm: {PRODUCTS[p].name}.</li>
      ))}
      {i.safetyWarnings > 0 && (
        <li>
          {i.workerId === PLAYER_WORKER_ID
            ? `Bạn định bán hàng cho khách có triệu chứng rồi kịp dừng lại (${i.safetyWarnings} lần).`
            : `Bạn đã ngăn ${worker?.name ?? 'nhân viên'} bán hàng cho khách có triệu chứng (${i.safetyWarnings} lần).`}
        </li>
      )}
      <li>
        Kết quả: {OUTCOME[i.outcome]}
        {i.productId && ` — ${PRODUCTS[i.productId].name}, ${i.price} ${BRAND.currency}`}
        {i.price !== null && i.productId && i.price > PRODUCTS[i.productId].referencePrice && ` (giá tham khảo ${PRODUCTS[i.productId].referencePrice} ${BRAND.currency})`}.
      </li>
      <li>
        Điểm nghiệp vụ lượt này: <b>{i.performance === null ? 'không chấm (chưa ai phục vụ)' : `${i.performance}/100`}</b>
      </li>
    </ol>
  );
}

function ComplaintCard({ state, complaintId, review }: { state: State; complaintId: string; review: DeepReadonly<Review> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const voucherCost = state.config.reputation.voucherCost;
  const respond = (response: ComplaintResponse) => {
    const r = bridge.dispatch({ type: 'respondComplaint', complaintId, response });
    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
  };
  return (
    <li className={`review-card complaint fam-${review.familiarity}`}>
      <ReviewHeader state={state} review={review} />
      <div className="responses">
        {(Object.keys(COMPLAINT_RESPONSES) as ComplaintResponse[]).map((key) => (
          <GameButton
            key={key}
            size="small"
            disabled={key === 'voucher' && state.money < voucherCost}
            onClick={() => respond(key)}
            title={RESPONSE_HINT[key]}
          >
            {COMPLAINT_RESPONSES[key].label}
            {key === 'voucher' && ` · ${voucherCost} ${BRAND.currency}`}
          </GameButton>
        ))}
      </div>
      <span className="small muted">
        Gợi ý: {RESPONSE_HINT.apologize} {RESPONSE_HINT.explain} Phản hồi không xoá được đánh giá — khách có thể sửa thêm tối
        đa 1 sao.
      </span>
    </li>
  );
}

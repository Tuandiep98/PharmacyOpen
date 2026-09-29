import type { OfflineSummary } from '@pharmacy/simulation';
import { DandelionLogo } from '../../art/Furniture';
import { BRAND } from '../../brand';
import { formatRating } from '../../ui/Stars';
import { GameButton } from '../../ui/primitives';
import { formatDuration, signed } from './LedgerSheet';

/** "Chào mừng trở lại": tóm tắt trung thực những gì đã xảy ra khi người chơi vắng mặt. */
export function OfflineDialog({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal offline" role="dialog" aria-modal="true" aria-labelledby="offline-title">
        <svg width={48} height={48} viewBox="-15 -15 30 30" aria-hidden>
          <DandelionLogo r={14} />
        </svg>
        <h1 id="offline-title">Chào mừng trở lại!</h1>
        <div className="offline-body">
        <p className="muted">Bạn đã vắng {formatDuration(summary.awayMs)}.</p>
        {!summary.storeOpen ? (
          <p className="notice warn">
            Tiệm đã đóng cửa trong lúc bạn vắng vì bạn tự đứng quầy — không mất khách, không trả lương. Muốn tiệm tự bán khi
            vắng mặt, hãy giao quầy cho nhân viên trước khi rời game.
          </p>
        ) : (
          <>
            <p>
              Nhân viên đã trông tiệm {formatDuration(summary.simulatedMs)}
              {summary.capped && ` (tính tối đa ${formatDuration(summary.simulatedMs)} mỗi lần vắng)`}.
            </p>
            <div className="day-highlights">
              <div className="day-highlight"><span>Xu thay đổi</span><strong className={summary.moneyDelta >= 0 ? 'pos' : 'neg'}>{signed(summary.moneyDelta)} <small>{BRAND.currency}</small></strong></div>
              <div className="day-highlight"><span>Đã phục vụ</span><strong>{summary.sales + summary.referrals}<small>/{summary.customers} khách</small></strong></div>
              <div className="day-highlight"><span>Khách bỏ về</span><strong className={summary.leftAngry + summary.turnedAway > 0 ? 'neg' : 'pos'}>{summary.leftAngry + summary.turnedAway}</strong></div>
            </div>
            <details className="day-details"><summary>Xem hoạt động khi vắng mặt</summary><dl className="ledger-rows offline-rows">
              <div>
                <dt>Khách ghé</dt>
                <dd>{summary.customers}{summary.returningCustomers > 0 ? ` · ${summary.returningCustomers} khách quen` : ''}</dd>
              </div>
              {summary.expiredStock > 0 && <div><dt>Hàng hết hạn</dt><dd className="neg">{summary.expiredStock} món</dd></div>}
              <div>
                <dt>Lượt bán · khuyên đi khám</dt>
                <dd>
                  {summary.sales} · {summary.referrals}
                </dd>
              </div>
              {summary.leftAngry + summary.turnedAway > 0 && (
                <div>
                  <dt>Khách bỏ về</dt>
                  <dd className="neg">{summary.leftAngry + summary.turnedAway}</dd>
                </div>
              )}
              <div>
                <dt>Doanh thu</dt>
                <dd className="pos">{signed(summary.revenue)}</dd>
              </div>
              <div>
                <dt>Nhập hàng</dt>
                <dd className="neg">{signed(-summary.stockCost)}</dd>
              </div>
              {summary.wages > 0 && (
                <div>
                  <dt>Lương ({summary.daysEnded} ngày)</dt>
                  <dd className="neg">{signed(-summary.wages)}</dd>
                </div>
              )}
              <div className="strong">
                <dt>Số xu thay đổi</dt>
                <dd className={summary.moneyDelta >= 0 ? 'pos' : 'neg'}>{signed(summary.moneyDelta)}</dd>
              </div>
              {summary.avgStars !== null && (
                <div>
                  <dt>Đánh giá mới</dt>
                  <dd>
                    {summary.reviews} · trung bình {formatRating(summary.avgStars)}★
                  </dd>
                </div>
              )}
            </dl></details>
            {summary.openComplaints > 0 && (
              <p className="notice warn">Có {summary.openComplaints} khiếu nại cần phản hồi — xem ở tab Đánh giá.</p>
            )}
          </>
        )}
        </div>
        <div className="modal-actions"><GameButton tone="primary" size="large" onClick={onClose} autoFocus>Vào tiệm</GameButton></div>
      </div>
    </div>
  );
}

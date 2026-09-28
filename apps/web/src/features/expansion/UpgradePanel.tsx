import { UPGRADE_IDS, UPGRADES, type DeepReadonly, type SimState } from '@pharmacy/simulation';
import { CheckIcon, LockIcon } from '../../art/Icons';
import { UpgradeArt } from '../../art/Upgrades';
import { BRAND } from '../../brand';
import { useBridge } from '../../game/useGame';
import { useUi } from '../../ui/uiStore';
import { GameButton, PanelHeading } from '../../ui/primitives';
import { REJECT_TEXT } from '../store/rejectText';

export function UpgradePanel({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  return (
    <div className="panel">
      <PanelHeading description="Mỗi nâng cấp đều có đánh đổi — hãy xem tiệm đang nghẽn ở đâu trước khi mua.">Mở rộng</PanelHeading>
      <Bottlenecks state={state} />
      <ul className="card-list">
        {UPGRADE_IDS.map((id) => {
          const u = UPGRADES[id]!;
          const owned = state.upgrades.includes(id);
          return (
            <li key={id} className={`upgrade-card ${owned ? 'owned' : ''}`}>
              <UpgradeArt id={id} />
              <div className="staff-info">
                <strong>{u.name}</strong>
                <span className="small">
                  <b>Lợi:</b> {u.benefit}
                </span>
                <span className="small muted">
                  <b>Đánh đổi:</b> {u.tradeoff}
                </span>
              </div>
              {owned ? (
                <span className="owned-badge">
                  <CheckIcon size={18} /> Đã có
                </span>
              ) : (
                <GameButton
                  tone="primary"
                  size="small"
                  disabled={state.money < u.cost}
                  onClick={() => {
                    const r = bridge.dispatch({ type: 'buyUpgrade', upgradeId: id });
                    if (!r.ok) pushToast('bad', REJECT_TEXT[r.reason]);
                  }}
                >
                  {u.cost} {BRAND.currency}
                </GameButton>
              )}
            </li>
          );
        })}
        <li className="upgrade-card locked">
          <UpgradeArt id="second-counter" />
          <div className="staff-info">
            <strong><LockIcon size={18} /> Quầy thứ hai</strong>
            <span className="small muted">Cần mở rộng mặt bằng — mở ở giai đoạn sau.</span>
          </div>
        </li>
      </ul>
    </div>
  );
}

/** Gợi ý điểm nghẽn từ số liệu thật của ván, để lựa chọn nâng cấp có căn cứ. */
function Bottlenecks({ state }: { state: DeepReadonly<SimState> }) {
  const { stats } = state;
  const hints: string[] = [];
  if (stats.turnedAway > 0) hints.push(`${stats.turnedAway} khách bỏ đi vì hàng chờ đầy — cần phục vụ nhanh hơn hoặc thêm chỗ chờ.`);
  if (stats.leftAngry > 0) hints.push(`${stats.leftAngry} khách bỏ về vì chờ lâu.`);
  const empty = Object.values(state.stock).filter((s) => s.shelf === 0).length;
  if (empty > 0) hints.push(`${empty} ô kệ đang trống — kệ rộng hơn hoặc nhân viên bổ sung kệ sẽ giúp.`);
  if (!hints.length) return null;
  return (
    <ul className="bottlenecks">
      {hints.map((h) => (
        <li key={h}>{h}</li>
      ))}
    </ul>
  );
}

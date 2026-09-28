import { MILESTONES, UPGRADES, facilityLevel, playerLevel, type DeepReadonly, type SimState } from '@pharmacy/simulation';
import { UpgradeArt } from '../../art/Upgrades';
import { BRAND } from '../../brand';
import { useBridge } from '../../game/useGame';
import { useUi } from '../../ui/uiStore';
import { GameButton, PanelHeading } from '../../ui/primitives';
import { REJECT_TEXT } from '../store/rejectText';

const FURNITURE = ['wide-shelf', 'sorted-shelf', 'scanner', 'bench', 'signboard'] as const;
const MAX_LEVEL: Record<string, number> = { 'wide-shelf': 4, 'sorted-shelf': 3, scanner: 3, bench: 3, signboard: 3 };

export function UpgradePanel({ state }: { state: DeepReadonly<SimState> }) {
  const level = playerLevel(state);
  const next = MILESTONES.find((m) => m.level > level);
  return <div className="panel expansion-panel">
    <PanelHeading description="Mở hàng mới theo từng mốc. Kho cho phép nhập, cửa hàng cho phép trưng bày; cần nâng cả hai.">Mở rộng</PanelHeading>
    <section className="level-banner" aria-label={`Tiệm cấp ${level}`}>
      <span className="level-seal">{level}</span>
      <div><strong>Tiệm cấp {level}</strong><span>{next ? `Mốc tiếp: bán ${next.sales} món và tới ngày ${next.day}` : 'Đã đạt cấp tiệm cao nhất'}</span></div>
      <span>{state.stats.sales} món đã bán · ngày {state.day}</span>
    </section>
    <div className="milestone-track" aria-label="Lộ trình mở mặt hàng">
      {MILESTONES.map((m) => <span key={m.level} className={m.level <= level ? 'reached' : ''} title={`Cấp ${m.level}: ${m.slots} loại hàng, ${m.sales} món bán, ngày ${m.day}`}>
        <b>{m.level}</b><small>{m.slots} món</small>
      </span>)}
    </div>
    <h3>Diện tích và kho</h3>
    <div className="upgrade-grid">
      <FacilityCard state={state} id="warehouse" label="Kho hàng" />
      <FacilityCard state={state} id="storefront" label="Cửa hàng" />
    </div>
    <h3>Đồ dùng trong tiệm</h3>
    <p className="small muted">Mỗi cấp tăng lợi ích và thay đổi diện mạo đồ vật trong cảnh. Giá cấp sau cao hơn vì lợi ích cộng dồn.</p>
    <div className="upgrade-grid">
      {FURNITURE.map((id) => <FurnitureCard key={id} state={state} id={id} />)}
    </div>
  </div>;
}

function BuyButton({ state, id, locked }: { state: DeepReadonly<SimState>; id: string; locked: boolean }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const u = UPGRADES[id]!;
  return <GameButton tone="primary" size="small" disabled={locked || state.money < u.cost} onClick={() => {
    const result = bridge.dispatch({ type: 'buyUpgrade', upgradeId: id });
    if (!result.ok) pushToast('bad', REJECT_TEXT[result.reason]);
  }}>{locked ? 'Chưa mở' : `${u.cost} ${BRAND.currency}`}</GameButton>;
}

function FacilityCard({ state, id, label }: { state: DeepReadonly<SimState>; id: 'warehouse' | 'storefront'; label: string }) {
  const current = facilityLevel(state, id);
  const nextLevel = current + 1;
  const u = UPGRADES[`${id}-${nextLevel}`];
  const locked = playerLevel(state) < nextLevel;
  return <article className="upgrade-card tier-card">
    <UpgradeArt id={id} level={current} />
    <div className="tier-copy"><strong>{label} · cấp {current}/5</strong>
      <span className="small">{current * 4} loại hàng {id === 'warehouse' ? 'có thể nhập' : 'có thể trưng bày'}</span>
      {u && <><span className="small muted">Cấp {nextLevel}: {u.benefit}</span>{locked && <span className="small tier-lock">Mở ở cấp tiệm {nextLevel}</span>}</>}
      {!u && <span className="small good-text">Đã đạt cấp tối đa</span>}
    </div>
    {u && <BuyButton state={state} id={u.id} locked={locked} />}
  </article>;
}

function FurnitureCard({ state, id }: { state: DeepReadonly<SimState>; id: typeof FURNITURE[number] }) {
  const current = state.upgrades.filter((upgrade) => upgrade === id || upgrade.startsWith(`${id}-`)).length;
  const nextLevel = current + 1;
  const max = MAX_LEVEL[id]!;
  const nextId = current === 0 ? id : `${id}-${nextLevel}`;
  const u = nextLevel <= max ? UPGRADES[nextId] : undefined;
  const locked = current > 0 && playerLevel(state) < nextLevel;
  return <article className="upgrade-card tier-card">
    <UpgradeArt id={id} level={current} />
    <div className="tier-copy"><strong>{UPGRADES[id]!.name} · cấp {current}/{max}</strong>
      <span className="small">{u ? `Cấp ${nextLevel}: ${u.benefit}` : 'Đã đạt cấp tối đa'}</span>
      {u && <span className="small muted">{u.tradeoff}</span>}
      {locked && <span className="small tier-lock">Mở ở cấp tiệm {nextLevel}</span>}
    </div>
    {u && <BuyButton state={state} id={u.id} locked={locked} />}
  </article>;
}

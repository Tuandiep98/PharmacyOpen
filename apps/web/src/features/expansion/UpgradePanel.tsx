import {
  MILESTONES,
  UPGRADES,
  facilityLevel,
  playerLevel,
  staffLimits,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { CoinIcon, GiftIcon, MapIcon } from "../../art/Icons";
import { Segmented } from "../../ui/Segmented";
import { CollectionPanel } from "../collection/CollectionPanel";
import { UpgradeArt } from "../../art/Upgrades";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { useUi } from "../../ui/uiStore";
import { GameButton, PanelHeading } from "../../ui/primitives";
import { REJECT_TEXT } from "../store/rejectText";

const FURNITURE = [
  "counter-2",
  "wide-shelf",
  "sorted-shelf",
  "scanner",
  "bench",
  "signboard",
] as const;
const MAX_LEVEL: Record<string, number> = {
  "counter-2": 1,
  "wide-shelf": 4,
  "sorted-shelf": 3,
  scanner: 3,
  bench: 3,
  signboard: 3,
};

/** Tab Mở rộng: nâng cấp tiệm và Bộ sưu tập đồ trang trí/đeo (thưởng mục tiêu ngày). */
export function UpgradePanel({ state }: { state: DeepReadonly<SimState> }) {
  const view = useUi((s) => s.expansionView);
  const setView = useUi((s) => s.setExpansionView);
  return (
    <div className="panel expansion-panel">
      <Segmented
        label="Mục trong Mở rộng"
        value={view}
        onChange={setView}
        options={[
          { id: "upgrades", label: "Nâng cấp", icon: <MapIcon /> },
          {
            id: "collection",
            label: "Bộ sưu tập",
            icon: <GiftIcon />,
            badge: state.collection.items.length,
          },
        ]}
      />
      {view === "upgrades" ? (
        <UpgradesView state={state} />
      ) : (
        <CollectionPanel state={state} />
      )}
    </div>
  );
}

function UpgradesView({ state }: { state: DeepReadonly<SimState> }) {
  const level = playerLevel(state);
  const next = MILESTONES.find((m) => m.level > level);
  return (
    <div className="upgrades-view">
      <PanelHeading description="Mở hàng mới theo từng mốc. Kho cho phép nhập, cửa hàng cho phép trưng bày; cần nâng cả hai.">
        Mở rộng
      </PanelHeading>
      <section className="level-banner" aria-label={`Tiệm cấp ${level}`}>
        <span className="level-seal">{level}</span>
        <div>
          <strong>Tiệm cấp {level}</strong>
          <span>
            {next
              ? `Mốc tiếp: bán ${next.sales} món và tới ngày ${next.day}`
              : "Đã đạt cấp tiệm cao nhất"}
          </span>
        </div>
        <span>
          {state.stats.sales} món đã bán · ngày {state.day}
        </span>
      </section>
      <div className="milestone-track" aria-label="Lộ trình mở mặt hàng">
        {MILESTONES.map((m) => (
          <span
            key={m.level}
            className={m.level <= level ? "reached" : ""}
            title={`Cấp ${m.level}: ${m.slots} loại hàng, ${m.sales} món bán, ngày ${m.day}`}
          >
            <b>{m.level}</b>
            <small>{m.slots} món</small>
          </span>
        ))}
      </div>
      <h3>Diện tích và kho</h3>
      <ul className="inventory-list upgrade-list">
        <FacilityCard state={state} id="warehouse" label="Kho hàng" />
        <FacilityCard state={state} id="storefront" label="Cửa hàng" />
      </ul>
      <h3>Đồ dùng trong tiệm</h3>
      <p className="small muted">
        Mỗi cấp tăng lợi ích và thay đổi diện mạo đồ vật trong cảnh. Giá cấp sau
        cao hơn vì lợi ích cộng dồn.
      </p>
      <ul className="inventory-list upgrade-list">
        {FURNITURE.map((id) => (
          <FurnitureCard key={id} state={state} id={id} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Một dòng nâng cấp, cùng khung với thẻ Kho hàng: cột trái là hình + huy hiệu cấp, giữa là tên và các
 * dòng mô tả, hàng dưới có nút nâng cấp. Viền báo trạng thái: nét đứt khi chưa mở, xanh khi đã tối đa.
 */
function UpgradeItem({
  state,
  art,
  name,
  current,
  max,
  nextId,
  unlockLevel,
  children,
}: {
  state: DeepReadonly<SimState>;
  art: React.ReactNode;
  name: string;
  current: number;
  max: number;
  /** Nâng cấp kế tiếp (undefined khi đã tối đa). */
  nextId: string | undefined;
  /** Cấp tiệm cần đạt để mua nâng cấp kế tiếp. */
  unlockLevel: number;
  children: React.ReactNode;
}) {
  const next = nextId ? UPGRADES[nextId] : undefined;
  const locked = !!next && playerLevel(state) < unlockLevel;
  const status = !next ? "maxed" : locked ? "locked" : "";
  const levelText =
    max === 1 ? (current ? "Đã lắp" : "Chưa lắp") : `${current}/${max}`;
  return (
    <li className={`upgrade-item ${status}`}>
      <div className="inv-visual upgrade-visual">
        <span className="upgrade-art-wrap">{art}</span>
        <span
          className={`inv-stock ${next ? "neutral" : "healthy"}`}
          aria-label={`Đang ở cấp ${current} trên ${max}`}
        >
          {levelText}
        </span>
      </div>
      <div className="inv-info">
        <strong className="inv-name">
          {name}
          {locked && (
            <span className="product-level upgrade-lock">
              Cấp tiệm {unlockLevel}
            </span>
          )}
        </strong>
        <span className="inv-description small muted">
          {children}
          {next ? (
            <span className="upgrade-next">
              Cấp {current + 1}: {next.benefit}
            </span>
          ) : (
            <span className="good-text">Đã đạt cấp tối đa</span>
          )}
          {next?.tradeoff && <span>{next.tradeoff}</span>}
        </span>
      </div>
      {next && (
        <div className="inv-actions">
          <BuyButton
            state={state}
            id={next.id}
            locked={locked}
            unlockLevel={unlockLevel}
            nextLevel={current + 1}
          />
        </div>
      )}
    </li>
  );
}

function BuyButton({
  state,
  id,
  locked,
  unlockLevel,
  nextLevel,
}: {
  state: DeepReadonly<SimState>;
  id: string;
  locked: boolean;
  unlockLevel: number;
  nextLevel: number;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const u = UPGRADES[id]!;
  const short = state.money < u.cost;
  const label = locked
    ? `Mở ở cấp tiệm ${unlockLevel}`
    : short
      ? `Thiếu ${u.cost - state.money} ${BRAND.currency}`
      : `${nextLevel === 1 ? "Lắp đặt" : `Nâng lên cấp ${nextLevel}`} · ${u.cost} ${BRAND.currency}`;
  return (
    <div className="restock-control">
      <GameButton
        tone="secondary"
        size="small"
        disabled={locked || short}
        onClick={() => {
          const result = bridge.dispatch({ type: "buyUpgrade", upgradeId: id });
          if (!result.ok) pushToast("bad", REJECT_TEXT[result.reason]);
        }}
      >
        <CoinIcon size={18} />
        {label}
      </GameButton>
    </div>
  );
}

function FacilityCard({
  state,
  id,
  label,
}: {
  state: DeepReadonly<SimState>;
  id: "warehouse" | "storefront";
  label: string;
}) {
  const current = facilityLevel(state, id);
  const nextId = UPGRADES[`${id}-${current + 1}`]
    ? `${id}-${current + 1}`
    : undefined;
  return (
    <UpgradeItem
      state={state}
      art={<UpgradeArt id={id} level={current} />}
      name={label}
      current={current}
      max={5}
      nextId={nextId}
      unlockLevel={current + 1}
    >
      <span>
        {current * 4} loại hàng{" "}
        {id === "warehouse" ? "có thể nhập" : "có thể trưng bày"}
      </span>
      {id === "storefront" && <StaffCapacityLine state={state} />}
    </UpgradeItem>
  );
}

function FurnitureCard({
  state,
  id,
}: {
  state: DeepReadonly<SimState>;
  id: (typeof FURNITURE)[number];
}) {
  const current = state.upgrades.filter(
    (upgrade) => upgrade === id || upgrade.startsWith(`${id}-`),
  ).length;
  const nextLevel = current + 1;
  const max = MAX_LEVEL[id]!;
  const nextId =
    nextLevel > max ? undefined : current === 0 ? id : `${id}-${nextLevel}`;
  // Cấp 1 của đồ dùng mua được ngay (trừ Quầy 2 cần cấp tiệm 3); các cấp sau cần cấp tiệm tương ứng.
  const unlockLevel = id === "counter-2" ? 3 : current > 0 ? nextLevel : 0;
  return (
    <UpgradeItem
      state={state}
      art={<UpgradeArt id={id} level={current} />}
      name={UPGRADES[id]!.name}
      current={current}
      max={max}
      nextId={nextId}
      unlockLevel={unlockLevel}
    >
      {null}
    </UpgradeItem>
  );
}

/** Quy mô đội hiện tại: Cửa hàng và Quầy 2 mở thêm chỗ nhân viên. */
function StaffCapacityLine({ state }: { state: DeepReadonly<SimState> }) {
  const { perShift, total } = staffLimits(state);
  return (
    <span>
      Đội tối đa {total} nhân viên · {perShift} người mỗi ca
    </span>
  );
}

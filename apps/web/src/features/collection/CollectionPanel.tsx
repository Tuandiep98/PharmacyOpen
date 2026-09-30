import {
  collectionBonus,
  COLLECTIBLES,
  DAY_REWARD_ITEM_CHANCE,
  ITEM_SELL_PRICE,
  MAX_COLLECTION,
  placeOf,
  placesFor,
  SLOT_PLACES,
  STAT_LABEL,
  type CollectibleItem,
  type CollectStat,
  type DeepReadonly,
  type Grade,
  type SimState,
} from "@pharmacy/simulation";
import { useState } from "react";
import { CollectibleIcon } from "../../art/Collectibles";
import { GiftIcon } from "../../art/Icons";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { EmptyState, GameButton, PanelHeading } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { REJECT_TEXT } from "../store/rejectText";
import { StaffAvatar } from "../staff/GradeBadge";
import { effectText, ItemEffects, placeLabel } from "./itemText";

type State = DeepReadonly<SimState>;
type Item = DeepReadonly<CollectibleItem>;

const GRADE_ORDER: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3 };
const FIT_LABEL = {
  pharmacy: "Hợp nhà thuốc",
  neutral: "Dễ thương",
  odd: "Lạc quẻ",
} as const;
const SLOT_LABEL = {
  wear: "Nhân vật đeo",
  counter: "Đặt trên quầy",
  shelf: "Đặt trên kệ",
  store: "Trang trí tiệm",
} as const;

/**
 * Bộ sưu tập: đồ rơi ra khi đạt mục tiêu ngày, có hạng S/A/B/C theo độ hợp tiệm và vẻ ngoài. Đặt ở
 * quầy/kệ/trong tiệm hoặc cho nhân vật đeo mới có tác dụng; bán lấy xu hoặc bỏ đi.
 */
export function CollectionPanel({ state }: { state: State }) {
  const [selected, setSelected] = useState<string | null>(null);
  const items = [...state.collection.items].sort(
    (a, b) =>
      Number(!placeOf(state, a.uid)) - Number(!placeOf(state, b.uid)) ||
      GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade],
  );
  const stats = (Object.keys(STAT_LABEL) as CollectStat[])
    .map((stat) => [stat, collectionBonus(state, stat)] as const)
    .filter(([, v]) => Math.abs(v) > 0.0001);
  const chance = Math.round((DAY_REWARD_ITEM_CHANCE[3] ?? 0) * 100);
  return (
    <>
      <PanelHeading
        description={`Đồ nhận được khi đạt mục tiêu ngày (3 sao: ${chance}% có đồ). Bộ sưu tập là của bạn, đi theo qua mọi chi nhánh. Chỉ món đang đặt hoặc đang đeo mới có tác dụng.`}
      >
        Bộ sưu tập
      </PanelHeading>
      <section className="collection-summary" aria-label="Tác dụng đang có">
        <strong>
          Đang có tác dụng{" "}
          <span className="small muted">
            ({state.collection.items.length}/{MAX_COLLECTION} món)
          </span>
        </strong>
        {stats.length === 0 ? (
          <span className="small muted">Chưa đặt món nào.</span>
        ) : (
          <ul className="item-effects">
            {stats.map(([stat, value]) => (
              <li key={stat} className={value >= 0 ? "pos" : "neg"}>
                {effectText(stat, value)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <PlaceGrid state={state} onPick={setSelected} />
      <h3>Túi đồ</h3>
      {items.length === 0 ? (
        <EmptyState icon={<GiftIcon />} title="Chưa có đồ sưu tầm">
          Đạt 2–3 sao mục tiêu cuối ngày để có cơ hội nhận đồ.
        </EmptyState>
      ) : (
        <ul className="collection-grid">
          {items.map((item) => (
            <ItemCard
              key={item.uid}
              state={state}
              item={item}
              open={selected === item.uid}
              onToggle={() =>
                setSelected(selected === item.uid ? null : item.uid)
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

/** Các chỗ đặt trong tiệm và trên người, cho biết đang đặt món gì. */
function PlaceGrid({
  state,
  onPick,
}: {
  state: State;
  onPick: (uid: string) => void;
}) {
  const places = [
    ...SLOT_PLACES.counter.filter((p) =>
      state.counters.some((c) => c.id === p),
    ),
    ...SLOT_PLACES.shelf,
    ...SLOT_PLACES.store,
  ];
  const itemOf = (place: string) => {
    const uid = state.collection.equipped[place];
    return uid ? state.collection.items.find((i) => i.uid === uid) : undefined;
  };
  return (
    <section aria-label="Chỗ đặt đồ">
      <h3>Trong tiệm</h3>
      <ul className="place-grid">
        {places.map((place) => {
          const item = itemOf(place);
          return (
            <li key={place}>
              <button
                type="button"
                className={`place-tile ${item ? "filled" : ""}`}
                disabled={!item}
                onClick={() => item && onPick(item.uid)}
                aria-label={`${placeLabel(state, place)}: ${item ? COLLECTIBLES[item.defId]?.name : "trống"}`}
              >
                <span className="place-icon">
                  {item ? (
                    <CollectibleIcon defId={item.defId} size={36} />
                  ) : (
                    <span className="place-empty" aria-hidden />
                  )}
                </span>
                <span className="place-name">{placeLabel(state, place)}</span>
                <span className="small muted">
                  {item ? COLLECTIBLES[item.defId]?.name : "Trống"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3>Nhân vật đeo</h3>
      <ul className="place-grid">
        {Object.values(state.workers).map((worker) => {
          const item = itemOf(`wear:${worker.id}`);
          return (
            <li key={worker.id}>
              <div className={`place-tile wearer ${item ? "filled" : ""}`}>
                <StaffAvatar worker={worker} size={40} badge="sm" />
                <span className="place-name">
                  {worker.name.split(" ").pop()}
                </span>
                <span className="small muted">
                  {item ? COLLECTIBLES[item.defId]?.name : "Chưa đeo gì"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemCard({
  state,
  item,
  open,
  onToggle,
}: {
  state: State;
  item: Item;
  open: boolean;
  onToggle: () => void;
}) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const def = COLLECTIBLES[item.defId];
  if (!def) return null;
  const place = placeOf(state, item.uid);
  const run = (command: Parameters<typeof bridge.dispatch>[0]) => {
    const r = bridge.dispatch(command);
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
    return r.ok;
  };
  return (
    <li className={`item-card grade-edge-${item.grade} ${open ? "open" : ""}`}>
      <button
        type="button"
        className="item-card-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="item-card-icon">
          <CollectibleIcon defId={item.defId} size={44} />
          <span className={`grade-badge grade-${item.grade} size-sm`}>
            {item.grade}
          </span>
        </span>
        <span className="item-card-text">
          <strong>{def.name}</strong>
          <span className="small muted">
            {SLOT_LABEL[def.slot]} · {FIT_LABEL[def.fit]}
          </span>
          <span className={`small ${place ? "item-placed" : "muted"}`}>
            {place ? `Đang ở: ${placeLabel(state, place)}` : "Đang cất"}
          </span>
        </span>
      </button>
      <ItemEffects item={item} />
      {open && (
        <div className="item-actions">
          <p className="small muted">{def.description}</p>
          <div className="item-place-buttons" role="group" aria-label="Đặt ở">
            {placesFor(state, item).map((target) => (
              <GameButton
                key={target}
                size="small"
                tone={target === place ? "primary" : "secondary"}
                aria-pressed={target === place}
                disabled={target === place}
                onClick={() =>
                  run({ type: "equipItem", uid: item.uid, place: target })
                }
              >
                {target === place ? "✓ " : ""}
                {placeLabel(state, target)}
              </GameButton>
            ))}
          </div>
          <div className="item-manage">
            {place && (
              <GameButton
                size="small"
                onClick={() => run({ type: "unequipItem", uid: item.uid })}
              >
                Cất đi
              </GameButton>
            )}
            <GameButton
              size="small"
              tone="sun"
              onClick={() => run({ type: "sellItem", uid: item.uid })}
            >
              Bán · {ITEM_SELL_PRICE[item.grade]} {BRAND.currency}
            </GameButton>
            <GameButton
              size="small"
              tone="danger"
              onClick={() => {
                if (!confirmDiscard) {
                  setConfirmDiscard(true);
                  return;
                }
                run({ type: "discardItem", uid: item.uid });
              }}
            >
              {confirmDiscard ? "Chạm lần nữa để bỏ" : "Bỏ đi"}
            </GameButton>
          </div>
        </div>
      )}
    </li>
  );
}

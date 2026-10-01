import type { Grade } from "@pharmacy/simulation";
import { SucculentArt } from "./SucculentArt";
import { TieredWearableArt } from "./TieredWearableArt";
import { TieredCounterArt } from "./TieredCounterArt";
import { TieredStoreArt } from "./TieredStoreArt";
import "./collectibles.css";

type Finish = {
  grade?: Grade;
  effects?: readonly { stat: string; value: number }[];
};

const WEARABLES = new Set([
  "round-glasses",
  "care-pin",
  "neck-bow",
  "flower-band",
  "cat-ears",
  "beach-shades",
]);
const COUNTER_ITEMS = new Set([
  "service-bell",
  "mint-jar",
  "lucky-cat",
  "dried-flowers",
  "hourglass",
  "teddy",
]);
const STORE_ITEMS = new Set([
  "money-plant",
  "notice-board",
  "paper-lantern",
  "disco-lights",
  "candy-speaker",
]);

/** Hạng là nền tảng; chỉ số tốt hoặc xấu điều chỉnh chi tiết hoàn thiện trong cùng hạng. */
export function appearanceLevel({ grade = "C", effects = [] }: Finish): number {
  const base = { C: 0, B: 1, A: 2, S: 3 }[grade];
  const scale: Record<string, number> = {
    awareness: 1,
    rating: 0.03,
    returnChance: 0.04,
    recruitLuck: 0.06,
    queuePatience: 0.05,
  };
  const score = effects.reduce(
    (sum, effect) => sum + effect.value / (scale[effect.stat] ?? 1),
    0,
  );
  return Math.max(
    0,
    Math.min(3, base + (score >= 1.5 ? 1 : 0) - (score <= -0.75 ? 1 : 0)),
  );
}

/** Đồ sưu tập dùng chung ở cảnh, túi đồ, phần thưởng ngày và trên nhân vật. */
export function CollectibleArt({
  defId,
  grade = "C",
  effects,
}: { defId: string } & Finish) {
  const finish = appearanceLevel({ grade, effects });
  if (defId === "succulent")
    return <SucculentArt grade={grade} finish={finish} />;
  return (
    <g className={`tier-art tier-${grade} finish-${finish}`}>
      {WEARABLES.has(defId) ? (
        <TieredWearableArt defId={defId} grade={grade} finish={finish} />
      ) : COUNTER_ITEMS.has(defId) ? (
        <TieredCounterArt defId={defId} grade={grade} finish={finish} />
      ) : STORE_ITEMS.has(defId) ? (
        <TieredStoreArt defId={defId} grade={grade} finish={finish} />
      ) : null}
    </g>
  );
}

export function CollectibleIcon({
  defId,
  size = 40,
  grade,
  effects,
}: { defId: string; size?: number } & Finish) {
  const wide = [
    "round-glasses",
    "beach-shades",
    "disco-lights",
    "flower-band",
    "cat-ears",
    "notice-board",
  ].includes(defId);
  const zoom = wide || defId === "succulent" ? 1 : 1.1;
  return (
    <svg width={size} height={size} viewBox="-20 -38 40 42" aria-hidden>
      <g transform={`translate(0 1) scale(${zoom})`}>
        <CollectibleArt defId={defId} grade={grade} effects={effects} />
      </g>
    </svg>
  );
}

/** Tọa độ nhân vật giữ nguyên để kính, băng đô và phụ kiện luôn vào đúng vị trí. */
export function WornAccessory({
  defId,
  part,
  grade,
  effects,
}: { defId: string; part: "head" | "body" } & Finish) {
  const art = <CollectibleArt defId={defId} grade={grade} effects={effects} />;
  if (part === "body") {
    if (defId === "care-pin")
      return <g transform="translate(-9 -36) scale(0.42)">{art}</g>;
    if (defId === "neck-bow")
      return <g transform="translate(0 -45) scale(0.5)">{art}</g>;
    return null;
  }
  switch (defId) {
    case "round-glasses":
    case "beach-shades":
      return <g transform="translate(0 -59.5) scale(1.12)">{art}</g>;
    case "flower-band":
      return <g transform="translate(0 -88) scale(1.35)">{art}</g>;
    case "cat-ears":
      return <g transform="translate(0 -92) scale(1.3)">{art}</g>;
    default:
      return null;
  }
}

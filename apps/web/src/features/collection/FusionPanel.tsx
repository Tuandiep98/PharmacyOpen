import {
  COLLECTIBLES,
  FUSE_PITY,
  fuseGradeOdds,
  fusePityReady,
  fuseSlotOdds,
  GRADES,
  ITEM_SELL_PRICE,
  placeOf,
  type CollectibleItem,
  type DeepReadonly,
  type Grade,
  type SimState,
} from "@pharmacy/simulation";
import { useEffect, useRef, useState } from "react";
import { CollectibleIcon } from "../../art/Collectibles";
import { CapsuleIcon, GiftIcon } from "../../art/Icons";
import { playSfx } from "../../audio/sfx";
import { BRAND } from "../../brand";
import { celebrate } from "../../fx/confetti";
import { useBridge } from "../../game/useGame";
import { EmptyState, GameButton, PanelHeading } from "../../ui/primitives";
import { gradeNameClass } from "../../ui/gradeName";
import { useUi } from "../../ui/uiStore";
import { reducedMotion } from "../../ui/settings";
import { REJECT_TEXT } from "../store/rejectText";
import { ItemEffects } from "./itemText";
import "./fusion.css";

type State = DeepReadonly<SimState>;
type Item = DeepReadonly<CollectibleItem>;

const SLOT_TEXT = {
  wear: "Nhân vật đeo",
  counter: "Đặt trên quầy",
  shelf: "Đặt trên kệ",
  store: "Trang trí tiệm",
} as const;
const GRADE_ORDER: Record<Grade, number> = { S: 0, A: 1, B: 2, C: 3 };
/** Thời gian viên nang lắc trước khi mở; người dùng giảm chuyển động thì mở ngay. */
const ROLL_MS = 1100;

type Phase =
  | { kind: "pick" }
  | { kind: "rolling"; uid: string; pityBefore: number }
  | { kind: "result"; uid: string; pity: boolean };

/**
 * Ghép đồ kiểu máy gacha: chọn 3 món trong túi, xem tỉ lệ ra hạng/loại công khai, bấm ghép thì viên nang
 * lắc rồi mở ra món mới. Có bảo hiểm: ghép liên tiếp chưa ra A/S đủ số lần thì lần kế chắc chắn A trở lên.
 */
export function FusionPanel({ state }: { state: State }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const byUid = new Map(state.collection.items.map((i) => [i.uid, i]));
  const chosen = picked
    .map((uid) => byUid.get(uid))
    .filter((i): i is Item => !!i);
  const hiddenUid = phase.kind === "rolling" ? phase.uid : null;
  const bag = [...state.collection.items]
    .filter((i) => i.uid !== hiddenUid)
    .sort(
      (a, b) =>
        GRADE_ORDER[b.grade] - GRADE_ORDER[a.grade] ||
        Number(!!placeOf(state, a.uid)) - Number(!!placeOf(state, b.uid)),
    );
  // Lúc viên nang còn lắc, giữ số bảo hiểm cũ để không lộ trước kết quả.
  const pityCount =
    phase.kind === "rolling"
      ? phase.pityBefore
      : (state.collection.fusePity ?? 0);
  const pity =
    phase.kind === "rolling"
      ? pityCount >= FUSE_PITY - 1
      : fusePityReady(state);
  const ready = chosen.length === 3 && phase.kind === "pick";

  const toggle = (uid: string) => {
    if (phase.kind === "rolling") return;
    if (phase.kind === "result") setPhase({ kind: "pick" });
    setPicked((list) =>
      list.includes(uid)
        ? list.filter((id) => id !== uid)
        : list.length >= 3
          ? list
          : [...list, uid],
    );
  };

  const fuse = () => {
    if (!ready) return;
    const willPity = pity;
    const pityBefore = state.collection.fusePity ?? 0;
    const r = bridge.dispatch({ type: "fuseItems", uids: picked });
    if (!r.ok) {
      pushToast("bad", REJECT_TEXT[r.reason]);
      return;
    }
    const items = bridge.state.collection.items;
    const made = items[items.length - 1]!;
    setPicked([]);
    playSfx("pick");
    const reveal = () => {
      setPhase({ kind: "result", uid: made.uid, pity: willPity });
      playSfx(
        made.grade === "S"
          ? "gachaS"
          : made.grade === "A"
            ? "gachaA"
            : "gachaB",
      );
      if (made.grade === "S") celebrate();
    };
    if (reducedMotion()) {
      reveal();
      return;
    }
    setPhase({ kind: "rolling", uid: made.uid, pityBefore });
    timer.current = window.setTimeout(reveal, ROLL_MS);
  };

  const result = phase.kind === "result" ? byUid.get(phase.uid) : undefined;

  return (
    <>
      <PanelHeading description="Đưa 3 món trong túi vào máy để đổi lấy 1 món mới ngẫu nhiên. Hạng món đưa vào càng cao, càng dễ ra hạng cao; loại món mới theo loại 3 món đưa vào. 3 món đã ghép sẽ mất.">
        Ghép đồ
      </PanelHeading>
      {state.collection.items.length < 3 && phase.kind === "pick" ? (
        <EmptyState icon={<CapsuleIcon />} title="Cần ít nhất 3 món">
          Đạt 2–3 sao mục tiêu cuối ngày để có thêm đồ sưu tầm, rồi quay lại
          ghép.
        </EmptyState>
      ) : (
        <>
          <section
            className={`fusion-machine phase-${phase.kind} ${result ? `result-${result.grade}` : ""}`}
            aria-label="Máy ghép đồ"
          >
            <div className="fusion-slots">
              {[0, 1, 2].map((i) => {
                const item = chosen[i];
                return (
                  <button
                    key={i}
                    type="button"
                    className={`fusion-slot ${item ? `filled grade-edge-${item.grade}` : ""}`}
                    disabled={!item || phase.kind === "rolling"}
                    onClick={() => item && toggle(item.uid)}
                    aria-label={
                      item
                        ? `Bỏ ${COLLECTIBLES[item.defId]?.name} khỏi máy`
                        : `Ô ${i + 1} trống`
                    }
                  >
                    {item ? (
                      <>
                        <CollectibleIcon
                          defId={item.defId}
                          grade={item.grade}
                          effects={item.effects}
                          size={48}
                        />
                        <span
                          className={`grade-badge grade-${item.grade} size-sm`}
                        >
                          {item.grade}
                        </span>
                      </>
                    ) : (
                      <span className="fusion-slot-plus" aria-hidden>
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="fusion-orb-wrap" aria-live="polite">
              {result ? (
                <div className="fusion-result">
                  <span className="fusion-rays" aria-hidden />
                  <span className="fusion-result-icon">
                    <CollectibleIcon
                      defId={result.defId}
                      grade={result.grade}
                      effects={result.effects}
                      size={96}
                    />
                    <span
                      className={`grade-badge grade-${result.grade} size-lg`}
                    >
                      {result.grade}
                    </span>
                  </span>
                  <strong className={gradeNameClass(result.grade)}>
                    {COLLECTIBLES[result.defId]?.name}
                  </strong>
                  <span className="small muted">
                    {phase.kind === "result" && phase.pity
                      ? "Bảo hiểm kích hoạt · "
                      : ""}
                    {SLOT_TEXT[COLLECTIBLES[result.defId]!.slot]} · đã vào túi
                    đồ
                  </span>
                  <ItemEffects item={result} />
                </div>
              ) : (
                <div className="fusion-orb" aria-hidden>
                  <span className="fusion-orb-top" />
                  <span className="fusion-orb-bottom">
                    <GiftIcon />
                  </span>
                  <span className="fusion-orb-band" />
                </div>
              )}
              {phase.kind === "rolling" && (
                <span className="sr-only">Đang ghép…</span>
              )}
            </div>
            {phase.kind === "result" ? (
              <GameButton
                tone="primary"
                size="large"
                onClick={() => setPhase({ kind: "pick" })}
              >
                Ghép tiếp
              </GameButton>
            ) : (
              <GameButton
                tone="primary"
                size="large"
                disabled={!ready}
                onClick={fuse}
                icon={<CapsuleIcon />}
              >
                {phase.kind === "rolling"
                  ? "Đang ghép…"
                  : chosen.length < 3
                    ? `Chọn thêm ${3 - chosen.length} món`
                    : "Ghép 3 món"}
              </GameButton>
            )}
          </section>
          <FusionOdds chosen={chosen} pity={pity} />
          <section className="fusion-pity" aria-label="Bảo hiểm ghép đồ">
            <div className="fusion-pity-text">
              <strong>Bảo hiểm</strong>
              <span className="small muted">
                {pity
                  ? "Lần ghép tới chắc chắn ra hạng A trở lên."
                  : `Còn ${FUSE_PITY - pityCount} lần ghép chưa ra A/S thì lần kế chắc chắn A trở lên.`}
              </span>
            </div>
            <div
              className="fusion-pity-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={FUSE_PITY - 1}
              aria-valuenow={Math.min(pityCount, FUSE_PITY - 1)}
              aria-label="Tiến độ bảo hiểm"
            >
              <span
                style={{
                  width: `${(Math.min(pityCount, FUSE_PITY - 1) / (FUSE_PITY - 1)) * 100}%`,
                }}
              />
            </div>
          </section>
          <h3>
            Chọn từ túi đồ{" "}
            <span className="small muted">({chosen.length}/3)</span>
          </h3>
          <ul className="fusion-bag">
            {bag.map((item) => {
              const def = COLLECTIBLES[item.defId];
              if (!def) return null;
              const order = picked.indexOf(item.uid);
              const inUse = !!placeOf(state, item.uid);
              const full = picked.length >= 3 && order < 0;
              return (
                <li key={item.uid}>
                  <button
                    type="button"
                    className={`fusion-bag-item grade-edge-${item.grade} ${order >= 0 ? "picked" : ""}`}
                    aria-pressed={order >= 0}
                    disabled={phase.kind === "rolling" || full}
                    onClick={() => toggle(item.uid)}
                  >
                    <span className="fusion-bag-icon">
                      <CollectibleIcon
                        defId={item.defId}
                        grade={item.grade}
                        effects={item.effects}
                        size={44}
                      />
                      <span
                        className={`grade-badge grade-${item.grade} size-sm`}
                      >
                        {item.grade}
                      </span>
                    </span>
                    <span
                      className={`fusion-bag-name ${gradeNameClass(item.grade)}`}
                    >
                      {def.name}
                    </span>
                    <span className="small muted">
                      {inUse
                        ? "Đang dùng"
                        : `${ITEM_SELL_PRICE[item.grade]} ${BRAND.currency}`}
                    </span>
                    {order >= 0 && (
                      <span className="fusion-bag-order" aria-hidden>
                        {order + 1}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {chosen.some((i) => placeOf(state, i.uid)) && (
            <p className="small muted">
              Món &quot;Đang dùng&quot; sẽ được gỡ khỏi chỗ đặt trước khi ghép.
            </p>
          )}
        </>
      )}
    </>
  );
}

/** Bảng tỉ lệ công khai (như các game gacha hiển thị tỉ lệ): hạng S/A/B/C và loại món có thể ra. */
function FusionOdds({ chosen, pity }: { chosen: Item[]; pity: boolean }) {
  if (chosen.length < 3)
    return (
      <section className="fusion-odds" aria-label="Tỉ lệ ra đồ">
        <strong>Tỉ lệ ra đồ</strong>
        <span className="small muted">
          Chọn đủ 3 món để xem tỉ lệ. Ví dụ 3 món hạng C: S 1% · A 9% · B 45% ·
          C 45%; 3 món hạng S chắc chắn ra hạng S.
        </span>
      </section>
    );
  const odds = fuseGradeOdds(
    chosen.map((i) => i.grade),
    pity,
  );
  const slots = fuseSlotOdds(chosen.map((i) => i.defId));
  const pct = (v: number) => (v > 0 && v < 1 ? "<1%" : `${Math.round(v)}%`);
  return (
    <section className="fusion-odds" aria-label="Tỉ lệ ra đồ">
      <strong>
        Tỉ lệ ra đồ {pity && <span className="fusion-pity-tag">Bảo hiểm</span>}
      </strong>
      <ul className="fusion-odds-bars">
        {GRADES.map((g) => (
          <li key={g}>
            <span className={`grade-badge grade-${g} size-sm`}>{g}</span>
            <span className="fusion-odds-track">
              <span
                className={`fusion-odds-fill fill-${g}`}
                style={{ width: `${odds[g]}%` }}
              />
            </span>
            <span className="fusion-odds-pct">{pct(odds[g])}</span>
          </li>
        ))}
      </ul>
      <span className="small muted">
        Loại món mới:{" "}
        {Object.entries(slots)
          .map(
            ([slot, v]) =>
              `${SLOT_TEXT[slot as keyof typeof SLOT_TEXT]} ${pct(v)}`,
          )
          .join(" · ")}
      </span>
    </section>
  );
}

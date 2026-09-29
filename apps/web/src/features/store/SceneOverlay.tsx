import type { DeepReadonly, WorkerTask } from "@pharmacy/simulation";
import { useLayoutEffect, useRef, useState } from "react";
import { BoxIcon, ParcelIcon } from "../../art/Icons";
import { ProductIcon } from "../../art/Products";
import type { Line } from "./dialogue";

/*
 * Lớp HTML phủ lên cảnh SVG: bảng tên và bong bóng thoại. Vẽ bằng HTML để chữ luôn đọc được
 * (12 px thật) dù cảnh co nhỏ trên điện thoại. Vị trí lấy từ toạ độ cảnh đã đổi sang pixel.
 * Không nhận chạm (pointer-events: none) nên không cản kéo thả hay chạm vào nhân vật.
 */

export type TagKind = "player" | "pharmacist" | "clerk" | "regular" | "loyal";

export type BubbleSpec =
  | (Line & {
      speaker: "customer" | "staff";
      compact?: boolean;
      need?: Line | null;
    })
  | {
      speaker: "task";
      task: DeepReadonly<WorkerTask>;
      compact?: boolean;
      text?: undefined;
      mood?: undefined;
    };

export interface OverlayItem {
  key: string;
  /** Đỉnh đầu nhân vật, đơn vị pixel trong khung cảnh. */
  at: { x: number; y: number };
  tag?: { text: string; kind: TagKind };
  bubble?: BubbleSpec;
  fading?: boolean;
}

const TAG_H = 20;
const TAG_GAP = 3;
const EDGE = 6;
/** Đuôi bong bóng lệch khỏi mép để chỉ đúng vào đầu nhân vật. */
const TAIL = 22;
/** Nửa bề rộng mũi đuôi + khoảng cách tối thiểu tới góc bo của bong bóng. */
const TAIL_MIN = 14;

interface TagPlacement {
  text: string;
  level: number;
  dx: number;
  /** Khách xếp hàng bị che gần hết sau người khác: bỏ bảng tên thay vì đè lên. */
  hidden?: boolean;
}

/** Ước lượng bề rộng bảng tên (11 px, chữ đậm) để xếp trước khi vẽ. */
function tagWidth(text: string, kind: TagKind) {
  return Math.ceil(text.length * 6.7) + 20 + (kind === "loyal" ? 10 : 0);
}

/** Bỏ cách gọi ("Cô Hương" → "Hương") khi hàng khách đứng sát nhau. */
function shortTag(text: string) {
  return text.split(" ").pop() || text;
}

/**
 * Xếp bảng tên không chồng nhau: thử tên đầy đủ, tên gọn, chữ cái đầu và tầng cao hơn.
 * Bảng tên luôn nằm trong khung (dịch ngang khi sát mép).
 */
function placeTags(items: OverlayItem[], width: number) {
  const placed: { left: number; right: number; y: number }[] = [];
  const result = new Map<string, TagPlacement>();
  const order = items
    .filter((item) => item.tag && !item.fading)
    // Người đứng quầy và khách ở quầy (có bong bóng) được giữ chỗ trước khách xếp hàng.
    .sort((a, b) => Number(!!b.bubble) - Number(!!a.bubble) || b.at.x - a.at.x);
  for (const item of order) {
    const tag = item.tag!;
    const short = shortTag(tag.text);
    // Khách xếp hàng không xếp tầng lên trước (sẽ bị bong bóng của khách ở quầy che): gọn tên → chữ cái đầu.
    const attempts: [string, number][] = item.bubble
      ? [
          [tag.text, 0],
          [tag.text, 1],
          [short, 0],
          [short, 1],
        ]
      : [
          [tag.text, 0],
          [short, 0],
          [short.charAt(0), 0],
        ];
    let chosen:
      (TagPlacement & { left: number; right: number; y: number }) | null = null;
    let fits = false;
    for (const [text, level] of attempts) {
      const w = tagWidth(text, tag.kind);
      const center = Math.max(
        EDGE + w / 2,
        Math.min(width - EDGE - w / 2, item.at.x),
      );
      const left = center - w / 2;
      const right = center + w / 2;
      const y = item.at.y - level * (TAG_H + TAG_GAP);
      const candidate = { text, level, dx: center - item.at.x, left, right, y };
      const hit = placed.some(
        (p) =>
          left < p.right + 2 &&
          right > p.left - 2 &&
          Math.abs(y - p.y) < TAG_H + TAG_GAP,
      );
      chosen = candidate;
      if (!hit) {
        fits = true;
        break;
      }
    }
    if (!fits && !item.bubble) {
      result.set(item.key, { ...chosen!, hidden: true });
      continue;
    }
    placed.push(chosen!);
    result.set(item.key, {
      text: chosen!.text,
      level: chosen!.level,
      dx: chosen!.dx,
    });
  }
  return result;
}

type Side = "left" | "right" | "center";
interface Shift {
  dx: number;
  dy: number;
  tail: number;
}
interface BubbleGeometry {
  key: string;
  side: Side;
  anchor: { x: number; y: number };
  bottom: number;
  /** Bong bóng đầy đủ (quầy đang chọn) giữ chỗ trước; bong bóng gọn nhường bằng cách nhấc lên. */
  compact: boolean;
  fading: boolean;
}

/**
 * Giữ bong bóng trong khung và không chồng nhau (hai quầy làm cảnh thu nhỏ): đo kích thước thật sau khi
 * vẽ, đẩy thân vào trong khi sát mép (đuôi dời ngược lại để vẫn chỉ đúng đầu nhân vật), rồi nhấc bong
 * bóng ưu tiên thấp lên trên bong bóng đã đặt nếu hai cái đè nhau.
 */
function layoutBubbles(
  geometry: BubbleGeometry[],
  elements: Map<string, HTMLDivElement>,
  frameWidth: number,
): Record<string, Shift> {
  const result: Record<string, Shift> = {};
  const placed: { l: number; t: number; r: number; b: number }[] = [];
  const order = [...geometry].sort(
    (a, b) =>
      Number(a.fading) - Number(b.fading) ||
      Number(a.compact) - Number(b.compact),
  );
  for (const g of order) {
    const el = elements.get(g.key);
    if (!el) continue;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left =
      g.side === "left"
        ? g.anchor.x + TAIL - w
        : g.side === "right"
          ? g.anchor.x - TAIL
          : g.anchor.x - w / 2;
    const tail0 = g.side === "left" ? w - 21 : g.side === "right" ? 21 : w / 2;
    let dx = 0;
    if (left < EDGE) dx = EDGE - left;
    else if (left + w > frameWidth - EDGE) dx = frameWidth - EDGE - (left + w);
    const top = g.anchor.y + g.bottom - h;
    let dy = top < EDGE ? EDGE - top : 0;
    const l = left + dx;
    const r = l + w;
    if (!g.fading) {
      for (let pass = 0; pass < 3; pass++) {
        const t = top + dy;
        const hit = placed.find(
          (p) => l < p.r && r > p.l && t < p.b && t + h > p.t,
        );
        if (!hit) break;
        const lifted = dy - (t + h - hit.t + 4);
        if (top + lifted < EDGE) break;
        dy = lifted;
      }
      placed.push({ l, t: top + dy, r, b: top + dy + h });
    }
    const tail = Math.max(TAIL_MIN, Math.min(w - TAIL_MIN, tail0 - dx)) - tail0;
    result[g.key] = { dx, dy, tail };
  }
  return result;
}

function sameShifts(a: Record<string, Shift>, b: Record<string, Shift>) {
  const keys = Object.keys(b);
  return (
    keys.length === Object.keys(a).length &&
    keys.every(
      (k) =>
        a[k] &&
        a[k].dx === b[k]!.dx &&
        a[k].dy === b[k]!.dy &&
        a[k].tail === b[k]!.tail,
    )
  );
}

export function SceneOverlay({
  items,
  width,
}: {
  items: OverlayItem[];
  width: number;
}) {
  const tags = placeTags(items, width);
  const placements = items.map((item) => {
    // Toạ độ con tính tương đối với đỉnh đầu; neo trượt theo nhân vật (cùng nhịp với cảnh).
    const tag = tags.get(item.key);
    const tagTop = -TAG_H - 2 - (tag?.level ?? 0) * (TAG_H + TAG_GAP);
    const side: Side =
      item.bubble?.speaker === "customer"
        ? "left"
        : item.bubble?.speaker === "staff"
          ? "right"
          : "center";
    return {
      item,
      tag,
      tagTop,
      side,
      bubbleBottom: item.tag && !tag?.hidden ? tagTop - 6 : -6,
    };
  });
  const geometry: BubbleGeometry[] = placements
    .filter((p) => p.item.bubble)
    .map((p) => ({
      key: p.item.key,
      side: p.side,
      anchor: p.item.at,
      bottom: p.bubbleBottom,
      compact: !!p.item.bubble?.compact,
      fading: !!p.item.fading,
    }));
  const elements = useRef(new Map<string, HTMLDivElement>());
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  // Chạy sau mỗi lần vẽ (geometry là mảng mới, chữ trong bong bóng có thể đổi); sameShifts chặn vòng lặp.
  useLayoutEffect(() => {
    const next = layoutBubbles(geometry, elements.current, width);
    setShifts((prev) => (sameShifts(prev, next) ? prev : next));
  }, [geometry, width]);
  return (
    <div className="scene-overlay" aria-hidden>
      {placements.map(({ item, tag, tagTop, side, bubbleBottom }) => {
        const shift = shifts[item.key];
        return (
          <div
            key={item.key}
            className={`overlay-anchor ${item.fading ? "fading" : ""}`}
            style={{ left: item.at.x, top: item.at.y }}
          >
            {item.tag && !tag?.hidden && (
              <span
                className={`nametag nametag-${item.tag.kind}`}
                style={{ top: tagTop, marginLeft: tag?.dx ?? 0 }}
              >
                {tag?.text ?? item.tag.text}
              </span>
            )}
            {item.bubble && (
              <Bubble
                spec={item.bubble}
                side={side}
                bottom={bubbleBottom}
                // Bong bóng gọn (quầy không chọn) hẹp hơn để nhường chỗ cho quầy đang chọn.
                maxWidth={Math.min(
                  item.bubble.compact ? 150 : 220,
                  width - EDGE * 2,
                )}
                shift={shift}
                bubbleRef={(el) => {
                  if (el) elements.current.set(item.key, el);
                  else elements.current.delete(item.key);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Bubble({
  spec,
  side,
  bottom,
  maxWidth,
  shift,
  bubbleRef: ref,
}: {
  spec: BubbleSpec;
  side: Side;
  bottom: number;
  maxWidth: number;
  shift?: Shift;
  bubbleRef: (el: HTMLDivElement | null) => void;
}) {
  const style = {
    top: bottom,
    maxWidth,
    "--dx": `${shift?.dx ?? 0}px`,
    "--dy": `${shift?.dy ?? 0}px`,
    "--tail-dx": `${shift?.tail ?? 0}px`,
  } as React.CSSProperties;
  if (spec.speaker === "task") {
    const { task } = spec;
    const progress =
      task.timerTotalMs > 0 ? 1 - task.timerMs / task.timerTotalMs : 1;
    return (
      <div ref={ref} className={`speech speech-task side-center`} style={style}>
        <span className="speech-body">
          {task.kind === "pack" && (
            <>
              <ParcelIcon size={18} />
              <ProductIcon id={task.productId} size={20} />
            </>
          )}
          {task.kind === "restock" && (
            <>
              <BoxIcon size={18} />
              <ProductIcon id={task.productId} size={20} />
            </>
          )}
          {task.kind === "label" && (
            <span className="speech-text">Ghi phiếu…</span>
          )}
          {task.kind === "slack" && (
            <span className="speech-text">Lướt điện thoại…</span>
          )}
        </span>
        <Progress value={progress} />
      </div>
    );
  }
  const compact = spec.compact;
  const need = spec.speaker === "customer" ? spec.need : null;
  return (
    <div
      ref={ref}
      className={`speech speech-${spec.speaker} side-${side} mood-${spec.mood ?? "normal"} ${compact ? "compact" : ""} ${spec.regular ? "regular" : ""}`}
      style={style}
    >
      {need && (
        <span className="speech-need">
          <b>Cần</b>
          {need.productId && <ProductIcon id={need.productId} size={18} />}
          <span className="speech-need-text">{need.text}</span>
        </span>
      )}
      {!(compact && need) && (
        <span className="speech-body">
          {spec.productId && (
            <ProductIcon id={spec.productId} size={compact ? 20 : 22} />
          )}
          {(!compact || !spec.productId) && (
            // Đổi câu thì chữ mới hiện dần, bong bóng giữ nguyên chỗ.
            <span key={spec.text} className="speech-text">
              {compact && spec.text.length > 1 ? "…" : spec.text}
            </span>
          )}
        </span>
      )}
      {spec.progress !== undefined && <Progress value={spec.progress} />}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <span className="speech-progress">
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </span>
  );
}

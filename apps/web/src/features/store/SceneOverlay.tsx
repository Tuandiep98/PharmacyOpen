import type { DeepReadonly, WorkerTask } from "@pharmacy/simulation";
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
const EDGE = 6;
/** Đuôi bong bóng lệch khỏi mép để chỉ đúng vào đầu nhân vật. */
const TAIL = 22;

export function SceneOverlay({
  items,
  width,
}: {
  items: OverlayItem[];
  width: number;
}) {
  return (
    <div className="scene-overlay" aria-hidden>
      {items.map((item) => {
        // Toạ độ con tính tương đối với đỉnh đầu; neo trượt theo nhân vật (cùng nhịp với cảnh).
        const tagTop = -TAG_H - 2;
        const bubbleBottom = item.tag ? tagTop - 6 : -6;
        const side =
          item.bubble?.speaker === "customer"
            ? "left"
            : item.bubble?.speaker === "staff"
              ? "right"
              : "center";
        const room =
          side === "left"
            ? item.at.x + TAIL - EDGE
            : side === "right"
              ? width - item.at.x + TAIL - EDGE
              : Math.min(item.at.x, width - item.at.x) * 2 - EDGE;
        return (
          <div
            key={item.key}
            className={`overlay-anchor ${item.fading ? "fading" : ""}`}
            style={{ left: item.at.x, top: item.at.y }}
          >
            {item.tag && (
              <span
                className={`nametag nametag-${item.tag.kind}`}
                style={{ top: tagTop }}
              >
                {item.tag.text}
              </span>
            )}
            {item.bubble && (
              <Bubble
                spec={item.bubble}
                side={side}
                bottom={bubbleBottom}
                maxWidth={Math.max(64, Math.min(room, 220))}
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
}: {
  spec: BubbleSpec;
  side: "left" | "right" | "center";
  bottom: number;
  maxWidth: number;
}) {
  const style = { top: bottom, maxWidth };
  if (spec.speaker === "task") {
    const { task } = spec;
    const progress =
      task.timerTotalMs > 0 ? 1 - task.timerMs / task.timerTotalMs : 1;
    return (
      <div className={`speech speech-task side-center`} style={style}>
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

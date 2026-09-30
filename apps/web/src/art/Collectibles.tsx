import type { ReactNode } from "react";
import { ART, INK } from "./palette";

/*
 * Art đồ sưu tầm, cùng nét mực 2 px với cảnh. `CollectibleArt` vẽ đồ vật với đáy ở (0,0), cao khoảng
 * 32 đơn vị, dùng chung cho icon giao diện và đồ trưng trong cảnh. `WornAccessory` vẽ món đeo lên nhân
 * vật theo toạ độ nhân vật (đầu ở (0,-78)). Không vẽ chữ thập hay biểu tượng gợi thuốc.
 */

const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
const thin = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: "round" as const };

const ART_BY_ID: Record<string, () => ReactNode> = {
  "round-glasses": () => (
    <g>
      <circle cx={-7} cy={-16} r={6} fill="#EAF4F6" {...S} />
      <circle cx={7} cy={-16} r={6} fill="#EAF4F6" {...S} />
      <path d="M-1,-17 Q0,-19 1,-17 M-13,-17 L-16,-19 M13,-17 L16,-19" fill="none" {...S} />
    </g>
  ),
  "care-pin": () => (
    <g>
      <circle cx={0} cy={-16} r={11} fill={ART.leaf} {...S} />
      <circle cx={0} cy={-16} r={7.5} fill="none" stroke={ART.leafLight} strokeWidth={1.4} />
      <path
        d="M0,-11 C-7,-15 -6,-22 -2.5,-21.5 C-1,-21.3 0,-20 0,-19 C0,-20 1,-21.3 2.5,-21.5 C6,-22 7,-15 0,-11Z"
        fill={ART.paper}
      />
    </g>
  ),
  "neck-bow": () => (
    <g>
      <path d="M0,-16 L-13,-24 L-13,-8 Z" fill={ART.coral} {...S} />
      <path d="M0,-16 L13,-24 L13,-8 Z" fill={ART.coral} {...S} />
      <circle cx={0} cy={-16} r={3.4} fill="#D97C6E" {...S} />
    </g>
  ),
  "flower-band": () => (
    <g>
      <path d="M-15,-6 Q0,-30 15,-6" fill="none" stroke={ART.leafLight} strokeWidth={4} strokeLinecap="round" />
      <path d="M-15,-6 Q0,-30 15,-6" fill="none" {...thin} />
      {[
        [-9, -17, "#F2B8C6"],
        [0, -20, ART.honey],
        [9, -17, "#F2B8C6"],
      ].map(([x, y, c]) => (
        <g key={`${x}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={3 * Math.cos((a * Math.PI) / 180)}
              cy={3 * Math.sin((a * Math.PI) / 180)}
              r={2.4}
              fill={c as string}
              {...thin}
            />
          ))}
          <circle r={1.6} fill={ART.paper} />
        </g>
      ))}
    </g>
  ),
  "cat-ears": () => (
    <g>
      <path d="M-16,-4 Q0,-20 16,-4" fill="none" stroke="#3C3C46" strokeWidth={4} strokeLinecap="round" />
      <path d="M-13,-10 L-12,-28 L-3,-15 Z" fill="#3C3C46" {...S} />
      <path d="M13,-10 L12,-28 L3,-15 Z" fill="#3C3C46" {...S} />
      <path d="M-11,-14 L-10.5,-22 L-6,-16 Z M11,-14 L10.5,-22 L6,-16 Z" fill="#F2B8C6" />
    </g>
  ),
  "beach-shades": () => (
    <g>
      <rect x={-15} y={-22} width={13} height={10} rx={4} fill="#2E3440" {...S} />
      <rect x={2} y={-22} width={13} height={10} rx={4} fill="#2E3440" {...S} />
      <path d="M-2,-19 H2 M-15,-19 L-17,-21 M15,-19 L17,-21" fill="none" {...S} />
      <path d="M-12,-19 L-8,-15 M5,-19 L9,-15" stroke="#9FB7D6" strokeWidth={1.5} />
    </g>
  ),
  succulent: () => (
    <g>
      <path d="M-10,-12 H10 L7,0 H-7 Z" fill={ART.coral} {...S} />
      <path d="M-11,-14 H11 V-11 H-11 Z" fill="#D07A6C" {...S} />
      {[-7, -2, 3, 8].map((x, i) => (
        <path
          key={x}
          d={`M${x - 4},-14 Q${x},-${24 + (i % 2) * 5} ${x + 4},-14 Z`}
          fill={i % 2 ? ART.leafLight : "#6FB08A"}
          {...thin}
        />
      ))}
    </g>
  ),
  "service-bell": () => (
    <g>
      <rect x={-13} y={-5} width={26} height={5} rx={2} fill={ART.woodLight} {...S} />
      <path d="M-10,-5 Q-10,-20 0,-20 Q10,-20 10,-5 Z" fill="#E8C766" {...S} />
      <path d="M-5,-15 Q-3,-18 0,-18" fill="none" stroke={ART.paper} strokeWidth={1.6} strokeLinecap="round" />
      <rect x={-2} y={-25} width={4} height={5} rx={1.5} fill="#E8C766" {...S} />
    </g>
  ),
  "mint-jar": () => (
    <g>
      <rect x={-10} y={-24} width={20} height={24} rx={6} fill="#EAF6F2" {...S} />
      <rect x={-8} y={-29} width={16} height={6} rx={2} fill={ART.leaf} {...S} />
      {[
        [-4, -8, "#8ED3B6"],
        [4, -9, ART.paper],
        [0, -15, "#8ED3B6"],
        [-4, -18, ART.paper],
        [5, -17, "#8ED3B6"],
      ].map(([x, y, c]) => (
        <circle key={`${x}${y}`} cx={x as number} cy={y as number} r={3} fill={c as string} {...thin} />
      ))}
    </g>
  ),
  "lucky-cat": () => (
    <g>
      <path d="M-11,0 Q-13,-14 -8,-18 H8 Q13,-14 11,0 Z" fill={ART.paper} {...S} />
      <circle cx={0} cy={-22} r={9} fill={ART.paper} {...S} />
      <path d="M-8,-27 L-7,-34 L-2,-30 M8,-27 L7,-34 L2,-30" fill={ART.paper} {...S} />
      <path d="M11,-12 Q18,-16 16,-26" fill="none" {...S} />
      <circle cx={16} cy={-27} r={3} fill={ART.paper} {...S} />
      <path d="M-4,-23 h1 M3,-23 h1 M-2,-19 Q0,-17 2,-19" fill="none" {...thin} />
      <circle cx={0} cy={-9} r={4} fill={ART.honey} {...thin} />
      <path d="M-11,-14 H11" stroke={ART.coral} strokeWidth={2.4} />
    </g>
  ),
  "dried-flowers": () => (
    <g>
      <path d="M-7,0 Q-11,-8 -5,-14 H5 Q11,-8 7,0 Z" fill={ART.sky} {...S} />
      <path d="M-2,-14 L-8,-30 M0,-14 L0,-33 M2,-14 L8,-29" fill="none" stroke="#8C7A55" strokeWidth={1.6} />
      {[
        [-8, -30],
        [0, -33],
        [8, -29],
      ].map(([x, y]) => (
        <circle key={`${x}`} cx={x} cy={y} r={3.2} fill="#E3C28F" {...thin} />
      ))}
    </g>
  ),
  hourglass: () => (
    <g>
      <rect x={-10} y={-4} width={20} height={4} rx={1.5} fill={ART.wood} {...S} />
      <rect x={-10} y={-32} width={20} height={4} rx={1.5} fill={ART.wood} {...S} />
      <path d="M-7,-28 Q-7,-18 0,-16 Q-7,-14 -7,-4 H7 Q7,-14 0,-16 Q7,-18 7,-28 Z" fill="#EAF4F6" {...S} />
      <path d="M-5,-4 Q0,-10 5,-4 Z M-3,-24 H3 L0,-18 Z" fill={ART.honey} />
    </g>
  ),
  teddy: () => (
    <g>
      <ellipse cx={0} cy={-8} rx={10} ry={8} fill="#C9935F" {...S} />
      <circle cx={0} cy={-22} r={8} fill="#C9935F" {...S} />
      <circle cx={-7} cy={-28} r={3.4} fill="#C9935F" {...S} />
      <circle cx={7} cy={-28} r={3.4} fill="#C9935F" {...S} />
      <ellipse cx={0} cy={-19} rx={3.5} ry={2.6} fill="#E8C49A" />
      <path d="M-3,-23 h0.5 M3,-23 h0.5" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M-4,-13 Q0,-10 4,-13" fill="none" stroke={ART.coral} strokeWidth={2} />
    </g>
  ),
  "money-plant": () => (
    <g>
      <path d="M-9,-10 H9 L7,0 H-7 Z" fill={ART.paper} {...S} />
      <path d="M0,-10 V-34 M0,-18 L-8,-26 M0,-24 L8,-31" fill="none" stroke="#4E7F5A" strokeWidth={1.6} />
      {[
        [-9, -27],
        [9, -32],
        [-5, -35],
        [5, -22],
        [-8, -16],
      ].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={4.5} ry={3.2} fill="#5FA873" {...thin} />
      ))}
    </g>
  ),
  "notice-board": () => (
    <g>
      <rect x={-16} y={-30} width={32} height={24} rx={2} fill="#C9A06B" {...S} />
      <rect x={-12} y={-27} width={11} height={8} fill={ART.paper} {...thin} />
      <rect x={1} y={-26} width={11} height={10} fill="#F6E3A6" {...thin} />
      <rect x={-10} y={-17} width={9} height={8} fill="#DCEFE3" {...thin} />
      <circle cx={-6} cy={-27} r={1.4} fill={ART.coral} />
      <circle cx={6} cy={-26} r={1.4} fill={ART.leaf} />
      <path d="M-10,-2 V-6 M10,-2 V-6" {...S} />
    </g>
  ),
  "paper-lantern": () => (
    <g>
      <path d="M0,-38 V-33" {...S} />
      <rect x={-6} y={-34} width={12} height={4} rx={1} fill={ART.honey} {...S} />
      <ellipse cx={0} cy={-19} rx={11} ry={12} fill="#D6594A" {...S} />
      <path d="M-5,-30 Q-9,-19 -5,-8 M5,-30 Q9,-19 5,-8" fill="none" stroke="#F2A18F" strokeWidth={1.4} />
      <rect x={-6} y={-8} width={12} height={4} rx={1} fill={ART.honey} {...S} />
      <path d="M0,-4 V2" stroke={ART.honey} strokeWidth={2} />
    </g>
  ),
  "disco-lights": () => (
    <g>
      <path d="M-17,-30 Q0,-18 17,-30" fill="none" {...thin} />
      {[
        [-13, -27, "#FF6B6B"],
        [-6, -23, "#FFD56F"],
        [1, -22, "#6BC8FF"],
        [8, -24, "#9CFF8A"],
        [14, -28, "#E08BFF"],
      ].map(([x, y, c]) => (
        <ellipse key={`${x}`} cx={x as number} cy={(y as number) + 4} rx={2.6} ry={3.6} fill={c as string} {...thin} />
      ))}
      <path d="M-17,-8 Q0,4 17,-8" fill="none" {...thin} />
      {[
        [-11, -5, "#6BC8FF"],
        [-3, -2, "#FF6B6B"],
        [5, -2, "#FFD56F"],
        [12, -5, "#9CFF8A"],
      ].map(([x, y, c]) => (
        <ellipse key={`b${x}`} cx={x as number} cy={(y as number) + 3} rx={2.4} ry={3.2} fill={c as string} {...thin} />
      ))}
    </g>
  ),
  "candy-speaker": () => (
    <g>
      <rect x={-11} y={-32} width={22} height={32} rx={4} fill="#E86A9A" {...S} />
      <circle cx={0} cy={-11} r={7} fill="#3C3C46" {...S} />
      <circle cx={0} cy={-11} r={2.5} fill="#888" />
      <circle cx={0} cy={-25} r={3.6} fill="#3C3C46" {...thin} />
      <path d="M14,-22 Q18,-17 14,-12 M17,-26 Q23,-17 17,-8" fill="none" stroke={ART.honey} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  ),
};

/** Đồ vật với đáy ở (0,0). */
export function CollectibleArt({ defId }: { defId: string }) {
  return <>{ART_BY_ID[defId]?.() ?? null}</>;
}

/** Icon vuông cho giao diện (bộ sưu tập, tổng kết ngày, thẻ món). */
export function CollectibleIcon({
  defId,
  size = 40,
}: {
  defId: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="-20 -38 40 42" aria-hidden>
      <CollectibleArt defId={defId} />
    </svg>
  );
}

/**
 * Món đeo trên nhân vật (toạ độ nhân vật, đầu ở (0,-78)). `part = "head"` vẽ trong nhóm đầu (xoay theo
 * đầu), `"body"` vẽ trên áo.
 */
export function WornAccessory({
  defId,
  part,
}: {
  defId: string;
  part: "head" | "body";
}) {
  if (part === "body") {
    if (defId === "care-pin")
      return (
        <g transform="translate(-9 -36) scale(0.42)">
          <CollectibleArt defId={defId} />
        </g>
      );
    if (defId === "neck-bow")
      return (
        <g transform="translate(0 -45) scale(0.5)">
          <CollectibleArt defId={defId} />
        </g>
      );
    return null;
  }
  switch (defId) {
    case "round-glasses":
      return (
        <g transform="translate(0 -59.5) scale(1.12)">
          <CollectibleArt defId={defId} />
        </g>
      );
    case "beach-shades":
      return (
        <g transform="translate(0 -59.5) scale(1.12)">
          <CollectibleArt defId={defId} />
        </g>
      );
    case "flower-band":
      return (
        <g transform="translate(0 -88) scale(1.35)">
          <CollectibleArt defId={defId} />
        </g>
      );
    case "cat-ears":
      return (
        <g transform="translate(0 -92) scale(1.3)">
          <CollectibleArt defId={defId} />
        </g>
      );
    default:
      return null;
  }
}

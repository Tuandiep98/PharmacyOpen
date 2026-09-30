import type { ReactNode } from "react";
import { ART, INK } from "./palette";
import "./collectibles.css";

/*
 * Art đồ sưu tầm, cùng nét mực 2 px với cảnh. `CollectibleArt` vẽ đồ vật với đáy ở (0,0), cao khoảng
 * 32 đơn vị, dùng chung cho icon giao diện và đồ trưng trong cảnh. `WornAccessory` vẽ món đeo lên nhân
 * vật theo toạ độ nhân vật (đầu ở (0,-78)). Không vẽ chữ thập hay biểu tượng gợi thuốc.
 */

const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
const thin = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: "round" as const };

const ART_BY_ID: Record<string, () => ReactNode> = {
  "round-glasses": () => (
    <g className="collectible-eyewear">
      <circle cx={-7} cy={-16} r={6} fill="#EAF4F6" {...S} />
      <circle cx={7} cy={-16} r={6} fill="#EAF4F6" {...S} />
      <path d="M-1,-17 Q0,-19 1,-17 M-13,-17 L-16,-19 M13,-17 L16,-19" fill="none" {...S} />
    </g>
  ),
  "care-pin": () => (
    <g className="collectible-metal">
      <circle cx={0} cy={-16} r={11} fill={ART.leaf} {...S} />
      <circle cx={0} cy={-16} r={7.5} fill="none" stroke={ART.leafLight} strokeWidth={1.4} />
      <path
        d="M0,-11 C-7,-15 -6,-22 -2.5,-21.5 C-1,-21.3 0,-20 0,-19 C0,-20 1,-21.3 2.5,-21.5 C6,-22 7,-15 0,-11Z"
        fill={ART.paper}
      />
    </g>
  ),
  "neck-bow": () => (
    <g className="collectible-fabric">
      <path d="M0,-16 L-13,-24 L-13,-8 Z" fill={ART.coral} {...S} />
      <path d="M0,-16 L13,-24 L13,-8 Z" fill={ART.coral} {...S} />
      <circle cx={0} cy={-16} r={3.4} fill="#D97C6E" {...S} />
    </g>
  ),
  "flower-band": () => (
    <g className="collectible-floral">
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
    <g className="collectible-fabric">
      <path d="M-16,-4 Q0,-20 16,-4" fill="none" stroke="#3C3C46" strokeWidth={4} strokeLinecap="round" />
      <path d="M-13,-10 L-12,-28 L-3,-15 Z" fill="#3C3C46" {...S} />
      <path d="M13,-10 L12,-28 L3,-15 Z" fill="#3C3C46" {...S} />
      <path d="M-11,-14 L-10.5,-22 L-6,-16 Z M11,-14 L10.5,-22 L6,-16 Z" fill="#F2B8C6" />
    </g>
  ),
  "beach-shades": () => (
    <g className="collectible-eyewear">
      <rect x={-15} y={-22} width={13} height={10} rx={4} fill="#2E3440" {...S} />
      <rect x={2} y={-22} width={13} height={10} rx={4} fill="#2E3440" {...S} />
      <path d="M-2,-19 H2 M-15,-19 L-17,-21 M15,-19 L17,-21" fill="none" {...S} />
      <path d="M-12,-19 L-8,-15 M5,-19 L9,-15" stroke="#9FB7D6" strokeWidth={1.5} />
    </g>
  ),
  succulent: () => (
    <g className="collectible-plant">
      <path d="M-10,-12 H10 L7,0 H-7 Z" fill={ART.coral} {...S} />
      <path d="M-11,-14 H11 V-11 H-11 Z" fill="#D07A6C" {...S} />
      <g className="plant-leaves">{[-7, -2, 3, 8].map((x, i) => (
        <path
          key={x}
          d={`M${x - 4},-14 Q${x},-${24 + (i % 2) * 5} ${x + 4},-14 Z`}
          fill={i % 2 ? ART.leafLight : "#6FB08A"}
          {...thin}
        />
      ))}</g>
    </g>
  ),
  "service-bell": () => (
    <g className="collectible-bell">
      <rect x={-13} y={-5} width={26} height={5} rx={2} fill={ART.woodLight} {...S} />
      <path d="M-10,-5 Q-10,-20 0,-20 Q10,-20 10,-5 Z" fill="#E8C766" {...S} />
      <path d="M-5,-15 Q-3,-18 0,-18" fill="none" stroke={ART.paper} strokeWidth={1.6} strokeLinecap="round" />
      <rect x={-2} y={-25} width={4} height={5} rx={1.5} fill="#E8C766" {...S} />
    </g>
  ),
  "mint-jar": () => (
    <g className="collectible-glass">
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
    <g className="collectible-cat">
      <path d="M-11,0 Q-13,-14 -8,-18 H8 Q13,-14 11,0 Z" fill={ART.paper} {...S} />
      <circle cx={0} cy={-22} r={9} fill={ART.paper} {...S} />
      <path d="M-8,-27 L-7,-34 L-2,-30 M8,-27 L7,-34 L2,-30" fill={ART.paper} {...S} />
      <g className="cat-paw"><path d="M11,-12 Q18,-16 16,-26" fill="none" {...S} />
      <circle cx={16} cy={-27} r={3} fill={ART.paper} {...S} /></g>
      <path d="M-4,-23 h1 M3,-23 h1 M-2,-19 Q0,-17 2,-19" fill="none" {...thin} />
      <circle cx={0} cy={-9} r={4} fill={ART.honey} {...thin} />
      <path d="M-11,-14 H11" stroke={ART.coral} strokeWidth={2.4} />
    </g>
  ),
  "dried-flowers": () => (
    <g className="collectible-floral">
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
    <g className="collectible-glass">
      <rect x={-10} y={-4} width={20} height={4} rx={1.5} fill={ART.wood} {...S} />
      <rect x={-10} y={-32} width={20} height={4} rx={1.5} fill={ART.wood} {...S} />
      <path d="M-7,-28 Q-7,-18 0,-16 Q-7,-14 -7,-4 H7 Q7,-14 0,-16 Q7,-18 7,-28 Z" fill="#EAF4F6" {...S} />
      <path d="M-5,-4 Q0,-10 5,-4 Z M-3,-24 H3 L0,-18 Z" fill={ART.honey} />
      <path className="hourglass-sand" d="M0,-17 V-9" stroke={ART.honey} strokeWidth={1} strokeDasharray="2 2" />
    </g>
  ),
  teddy: () => (
    <g className="collectible-fabric">
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
    <g className="collectible-plant">
      <path d="M-9,-10 H9 L7,0 H-7 Z" fill={ART.paper} {...S} />
      <path d="M0,-10 V-34 M0,-18 L-8,-26 M0,-24 L8,-31" fill="none" stroke="#4E7F5A" strokeWidth={1.6} />
      <g className="plant-leaves">{[
        [-9, -27],
        [9, -32],
        [-5, -35],
        [5, -22],
        [-8, -16],
      ].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={4.5} ry={3.2} fill="#5FA873" {...thin} />
      ))}</g>
    </g>
  ),
  "notice-board": () => (
    <g className="collectible-wood">
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
    <g className="collectible-lantern">
      <path d="M0,-38 V-33" {...S} />
      <rect x={-6} y={-34} width={12} height={4} rx={1} fill={ART.honey} {...S} />
      <ellipse cx={0} cy={-19} rx={11} ry={12} fill="#D6594A" {...S} />
      <path d="M-5,-30 Q-9,-19 -5,-8 M5,-30 Q9,-19 5,-8" fill="none" stroke="#F2A18F" strokeWidth={1.4} />
      <rect x={-6} y={-8} width={12} height={4} rx={1} fill={ART.honey} {...S} />
      <path d="M0,-4 V2" stroke={ART.honey} strokeWidth={2} />
    </g>
  ),
  "disco-lights": () => (
    <g className="collectible-lights">
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
    <g className="collectible-speaker">
      <rect x={-11} y={-32} width={22} height={32} rx={4} fill="#E86A9A" {...S} />
      <circle cx={0} cy={-11} r={7} fill="#3C3C46" {...S} />
      <circle cx={0} cy={-11} r={2.5} fill="#888" />
      <circle cx={0} cy={-25} r={3.6} fill="#3C3C46" {...thin} />
      <path d="M14,-22 Q18,-17 14,-12 M17,-26 Q23,-17 17,-8" fill="none" stroke={ART.honey} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  ),
};

type Finish = { grade?: "S" | "A" | "B" | "C"; effects?: readonly { stat: string; value: number }[] };

/** Hạng quyết định vật liệu; chỉ số tốt tăng độ hoàn thiện, chỉ số âm giảm đi. */
export function appearanceLevel({ grade = "C", effects = [] }: Finish): number {
  const base = { C: 0, B: 1, A: 2, S: 3 }[grade];
  const scale: Record<string, number> = { awareness: 1, rating: .03, returnChance: .04, recruitLuck: .06, queuePatience: .05 };
  const score = effects.reduce((sum, effect) => sum + effect.value / (scale[effect.stat] ?? 1), 0);
  return Math.max(0, Math.min(3, base + (score >= 1.5 ? 1 : 0) - (score <= -.75 ? 1 : 0)));
}

const GLEAM_POINTS: Record<string, [number, number][]> = {
  "round-glasses": [[-12, -21], [10, -21]], "beach-shades": [[-11, -23], [9, -23]],
  "care-pin": [[6, -24]], "neck-bow": [[0, -17]], "flower-band": [[0, -25], [11, -21]],
  "cat-ears": [[-11, -28], [11, -28]], succulent: [[-7, -24], [8, -20]],
  "service-bell": [[3, -19]], "mint-jar": [[-6, -23], [6, -14]], "lucky-cat": [[4, -25]],
  "dried-flowers": [[0, -33]], hourglass: [[5, -28]], teddy: [[5, -27]],
  "money-plant": [[-9, -29], [8, -33]], "notice-board": [[11, -29]],
  "paper-lantern": [[6, -29]], "disco-lights": [[-13, -29], [8, -25]],
  "candy-speaker": [[7, -29]],
};

/** Khối sáng và bóng riêng cho từng chất liệu, luôn hiện ở mọi hạng. */
const VOLUME_DETAILS: Record<string, () => ReactNode> = {
  "round-glasses": () => <g fill="none" strokeLinecap="round"><path d="M-11,-20 Q-7,-23 -4,-20 M3,-20 Q7,-23 10,-20" stroke="#fff" strokeWidth={1.6} opacity={.9}/><path d="M-11,-13 Q-7,-11 -3,-14 M3,-14 Q7,-11 11,-13" stroke="#9bbec2" strokeWidth={1} opacity={.65}/></g>,
  "care-pin": () => <g><path d="M1,-26 Q11,-23 11,-16 Q10,-10 5,-7 Q9,-16 1,-26Z" fill="#164d43" opacity={.4}/><path d="M-8,-19 Q-7,-24 -2,-25" fill="none" stroke="#e5f4d9" strokeWidth={2} strokeLinecap="round"/></g>,
  "neck-bow": () => <g><path d="M-12,-9 L-1,-15 L-12,-13Z M12,-9 L1,-15 L12,-13Z" fill="#8e3d41" opacity={.4}/><path d="M-11,-21 L-3,-17 M11,-21 L3,-17" stroke="#ffdfcf" strokeWidth={1.5} strokeLinecap="round"/></g>,
  "flower-band": () => <g><path d="M-14,-7 Q0,-31 14,-7" fill="none" stroke="#d5edca" strokeWidth={1.2}/><circle cx={-9} cy={-18} r={1.4} fill="#fff7e2"/><circle cx={0} cy={-21} r={1.4} fill="#fff7e2"/><circle cx={9} cy={-18} r={1.4} fill="#fff7e2"/></g>,
  "cat-ears": () => <g><path d="M-12,-25 L-11,-12 L-5,-15Z M12,-25 L11,-12 L5,-15Z" fill="#667075" opacity={.36}/><path d="M-14,-8 Q0,-18 14,-8" fill="none" stroke="#9ca3a1" strokeWidth={1.3}/></g>,
  "beach-shades": () => <g><path d="M-13,-20 L-8,-22 L-4,-22 L-13,-15Z M4,-20 L9,-22 L13,-22 L4,-15Z" fill="#96bcd1" opacity={.55}/><path d="M-14,-13 Q-8,-10 -3,-13 M3,-13 Q8,-10 14,-13" fill="none" stroke="#121f2b" strokeWidth={1}/></g>,
  succulent: () => <g><path d="M1,-11 H9 L6,0 H1Z" fill="#8d4b43" opacity={.35}/><path d="M-6,-7 L-5,-3" stroke="#ffd2a6" strokeWidth={1.5} strokeLinecap="round"/><path d="M-7,-19 L-4,-16 M3,-24 L5,-18" stroke="#d8f3ba" strokeWidth={1.3} strokeLinecap="round"/></g>,
  "service-bell": () => <g><path d="M2,-19 Q10,-17 10,-5 H4 Q8,-13 2,-19Z" fill="#b67c39" opacity={.4}/><path d="M-7,-8 Q-8,-16 -2,-18" fill="none" stroke="#fff5bd" strokeWidth={2} strokeLinecap="round"/></g>,
  "mint-jar": () => <g><path d="M4,-23 H9 V-6 Q9,-1 4,-1 H1 Q6,-4 4,-23Z" fill="#8bbcb5" opacity={.25}/><path d="M-7,-20 V-8" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={.9}/><path d="M-5,-3 H3" stroke="#b1d8c8" strokeWidth={1}/></g>,
  "lucky-cat": () => <g><path d="M5,-29 Q12,-24 10,-17 Q14,-11 11,0 H5 Q9,-9 5,-17 Q9,-24 5,-29Z" fill="#d8cbad" opacity={.4}/><path d="M-8,-14 Q-10,-7 -8,-3" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round"/></g>,
  "dried-flowers": () => <g><path d="M1,-14 H5 Q11,-8 7,0 H2 Q6,-8 1,-14Z" fill="#557e84" opacity={.25}/><path d="M-6,-7 Q-7,-4 -4,-2" fill="none" stroke="#e9f5ef" strokeWidth={1.3}/><circle cx={-9} cy={-31} r={1.2} fill="#fff0cf"/></g>,
  hourglass: () => <g><path d="M3,-28 H7 Q7,-18 1,-16 Q7,-14 7,-4 H3 Q3,-13 -1,-16 Q3,-19 3,-28Z" fill="#aac9c8" opacity={.27}/><path d="M-5,-26 Q-5,-20 -2,-18 M-5,-6 Q-5,-10 -3,-13" fill="none" stroke="#fff" strokeWidth={1.2} strokeLinecap="round"/></g>,
  teddy: () => <g><path d="M4,-29 Q9,-24 7,-18 Q12,-13 9,-5 Q5,-1 2,-1 Q7,-9 4,-15 Q8,-23 4,-29Z" fill="#8f5c3e" opacity={.36}/><path d="M-6,-23 Q-5,-27 -2,-28 M-7,-12 Q-4,-15 -2,-14" fill="none" stroke="#f4d5ac" strokeWidth={1.3} strokeLinecap="round"/></g>,
  "money-plant": () => <g><path d="M2,-9 H8 L6,0 H1Z" fill="#b4a484" opacity={.42}/><path d="M-6,-4 H3" stroke="#fff" strokeWidth={1.3} strokeLinecap="round"/><path d="M-11,-28 Q-8,-32 -5,-29 M6,-33 Q9,-35 11,-33" fill="none" stroke="#c6e9ac" strokeWidth={1.1}/></g>,
  "notice-board": () => <g><path d="M11,-28 H15 V-6 H11Z" fill="#805c43" opacity={.45}/><path d="M-14,-28 V-8 M-13,-30 H13" fill="none" stroke="#ffe0aa" strokeWidth={1.2}/><path d="M-11,-10 H-3 M2,-12 H11" stroke="#8a694c" strokeWidth={.8}/></g>,
  "paper-lantern": () => <g><path d="M4,-30 Q13,-26 11,-17 Q10,-9 4,-7 Q9,-19 4,-30Z" fill="#8f372f" opacity={.42}/><path d="M-6,-26 Q-10,-17 -6,-11" fill="none" stroke="#ffd8b0" strokeWidth={1.5} strokeLinecap="round"/></g>,
  "disco-lights": () => <g><circle cx={-13} cy={-23} r={4.5} fill="#ffb3ad" opacity={.22}/><circle cx={1} cy={-18} r={4.5} fill="#a7e2ff" opacity={.2}/><circle cx={5} cy={1} r={4} fill="#ffeaa4" opacity={.18}/></g>,
  "candy-speaker": () => <g><path d="M5,-30 H9 V-2 H5 Q9,-11 5,-30Z" fill="#9f3e6d" opacity={.32}/><path d="M-7,-28 V-19 M-7,-5 H-3" stroke="#ffd1e3" strokeWidth={1.5} strokeLinecap="round"/><circle cy={-11} r={4.3} fill="none" stroke="#555c67" strokeWidth={1}/></g>,
};

/** Chi tiết hạng cao đi theo cấu tạo từng món, không dùng cùng một lớp phủ cho mọi vật. */
const REFINED_DETAILS: Record<string, () => ReactNode> = {
  "round-glasses": () => <path d="M-15,-17 Q-16,-24 -7,-24 M1,-18 Q0,-21 -1,-18 M2,-24 Q10,-26 14,-21" fill="none" stroke="#d5ae57" strokeWidth={1.1} />,
  "beach-shades": () => <path d="M-13,-22 Q-9,-25 -3,-22 M3,-22 Q9,-25 13,-22" fill="none" stroke="#d5ae57" strokeWidth={1.1} />,
  "care-pin": () => <path d="M-7,-21 Q-11,-16 -7,-11 M7,-21 Q11,-16 7,-11" fill="none" stroke="#f7d784" strokeWidth={1.5} />,
  "neck-bow": () => <path d="M-11,-21 L-3,-16 L-11,-11 M11,-21 L3,-16 L11,-11" fill="none" stroke="#f5c6a5" strokeWidth={1.2} />,
  "flower-band": () => <path d="M-13,-10 Q0,-33 13,-10" fill="none" stroke="#f6e5b9" strokeWidth={1.1} />,
  "cat-ears": () => <path d="M-12,-25 L-6,-16 M12,-25 L6,-16" fill="none" stroke="#e5c878" strokeWidth={1.1} />,
  succulent: () => <path d="M-6,-7 H6 M-2,-14 Q-5,-18 -4,-22 M4,-14 Q6,-20 5,-23" fill="none" stroke="#f5dfaf" strokeWidth={1.1} />,
  "service-bell": () => <path d="M-8,-6 H8 M-6,-11 Q0,-16 6,-11" fill="none" stroke="#fff1bb" strokeWidth={1.1} />,
  "mint-jar": () => <path d="M-8,-21 V-6 Q-8,-2 -4,-2 M-5,-26 H5" fill="none" stroke="#b7ded3" strokeWidth={1.2} />,
  "lucky-cat": () => <path d="M-8,-12 Q0,-8 8,-12 M-3,-9 H3" fill="none" stroke="#d6ac58" strokeWidth={1.1} />,
  "dried-flowers": () => <path d="M-5,-10 Q0,-7 5,-10 M-8,-30 l-2,-3 M8,-29 l2,-3" fill="none" stroke="#f9dfb0" strokeWidth={1.2} />,
  hourglass: () => <path d="M-8,-30 H8 M-8,-2 H8 M0,-17 V-13" fill="none" stroke="#f3d891" strokeWidth={1.1} />,
  teddy: () => <path d="M-8,-10 Q0,-4 8,-10 M-5,-29 Q0,-25 5,-29" fill="none" stroke="#f2cc9a" strokeWidth={1.1} />,
  "money-plant": () => <path d="M-7,-4 H7 M-8,-27 l3,1 M8,-32 l-3,1" fill="none" stroke="#e3c873" strokeWidth={1.2} />,
  "notice-board": () => <path d="M-14,-28 V-8 H14 V-28 M-10,-13 H-4 M3,-20 H9" fill="none" stroke="#f2d598" strokeWidth={1.1} />,
  "paper-lantern": () => <path d="M0,-31 V-7 M-9,-19 H9" fill="none" stroke="#ffd5a2" strokeWidth={1.1} />,
  "disco-lights": () => <path d="M-16,-32 Q0,-20 16,-32 M-16,-10 Q0,2 16,-10" fill="none" stroke="#e9c873" strokeWidth={1.1} />,
  "candy-speaker": () => <path d="M-8,-29 H8 M-8,-4 H8" fill="none" stroke="#f9d6e4" strokeWidth={1.1} />,
};

/** Đồ vật với đáy ở (0,0); hoàn thiện riêng theo vật liệu và hạng. */
export function CollectibleArt({ defId, grade, effects }: { defId: string } & Finish) {
  const level = appearanceLevel({ grade, effects });
  const luminous = ["service-bell", "paper-lantern", "disco-lights", "hourglass", "mint-jar"].includes(defId);
  const organic = ["succulent", "flower-band", "dried-flowers", "money-plant"].includes(defId);
  const gleams = GLEAM_POINTS[defId] ?? [];
  return <g className={`collectible-art finish-${level} grade-${grade ?? "C"} ${luminous ? "finish-light" : organic ? "finish-organic" : "finish-solid"}`}>
    {level >= 3 && luminous && <ellipse className="collectible-aura" cx={0} cy={-18} rx={19} ry={23} fill={grade === "S" ? "#f9d474" : "#e8e2bf"} />}
    <g className="collectible-figure">{ART_BY_ID[defId]?.() ?? null}{VOLUME_DETAILS[defId]?.()}</g>
    {level >= 2 && REFINED_DETAILS[defId]?.()}
    {level >= 2 && !organic && gleams.slice(0, level >= 3 ? 2 : 1).map(([x, y], index) =>
      <path key={index} className="collectible-gleam" d={`M${x - 3},${y} H${x + 3} M${x},${y - 3} V${y + 3}`} stroke={organic ? "#e7f6cf" : "#fff8dc"} strokeWidth={level >= 3 ? 1.8 : 1.2} strokeLinecap="round" />)}
    {grade === "S" && (luminous || defId === "care-pin" || defId === "round-glasses") && <g className="collectible-spark" fill="#fff6cd">
      <path d="M-18,-35 l1.5,3 3,1.5 -3,1.5 -1.5,3 -1.5,-3 -3,-1.5 3,-1.5Z" />
      <circle cx={18} cy={-8} r={1.4} />
    </g>}
  </g>;
}

/** Icon vuông cho giao diện (bộ sưu tập, tổng kết ngày, thẻ món). */
export function CollectibleIcon({
  defId,
  size = 40,
  grade,
  effects,
}: {
  defId: string;
  size?: number;
} & Finish) {
  const wide = ["round-glasses", "beach-shades", "disco-lights", "flower-band", "cat-ears", "notice-board"].includes(defId);
  const zoom = wide ? 1.08 : 1.27;
  return (
    <svg width={size} height={size} viewBox="-20 -38 40 42" aria-hidden>
      <g transform={`translate(0 1) scale(${zoom})`}><CollectibleArt defId={defId} grade={grade} effects={effects} /></g>
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
  grade,
  effects,
}: {
  defId: string;
  part: "head" | "body";
} & Finish) {
  const art = <CollectibleArt defId={defId} grade={grade} effects={effects} />;
  if (part === "body") {
    if (defId === "care-pin")
      return (
        <g transform="translate(-9 -36) scale(0.42)">
          {art}
        </g>
      );
    if (defId === "neck-bow")
      return (
        <g transform="translate(0 -45) scale(0.5)">
          {art}
        </g>
      );
    return null;
  }
  switch (defId) {
    case "round-glasses":
      return (
        <g transform="translate(0 -59.5) scale(1.12)">
          {art}
        </g>
      );
    case "beach-shades":
      return (
        <g transform="translate(0 -59.5) scale(1.12)">
          {art}
        </g>
      );
    case "flower-band":
      return (
        <g transform="translate(0 -88) scale(1.35)">
          {art}
        </g>
      );
    case "cat-ears":
      return (
        <g transform="translate(0 -92) scale(1.3)">
          {art}
        </g>
      );
    default:
      return null;
  }
}

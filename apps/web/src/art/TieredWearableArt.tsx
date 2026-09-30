import type { Grade } from "@pharmacy/simulation";
import type { ReactNode } from "react";
import { ART, INK } from "./palette";

type Props = { defId: string; grade: Grade; finish: number };
const line = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const level: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 };

function Bloom({ x, y, color, small = false }: { x: number; y: number; color: string; small?: boolean }) {
  const radius = small ? 1.7 : 2.4;
  return <g transform={`translate(${x} ${y})`}>
    {[0, 72, 144, 216, 288].map((angle) => <circle key={angle} cx={Math.cos(angle * Math.PI / 180) * radius} cy={Math.sin(angle * Math.PI / 180) * radius} r={radius} fill={color} stroke={INK} strokeWidth={0.6} />)}
    <circle r={small ? 1.1 : 1.4} fill={ART.honey} />
  </g>;
}

/** Vật đeo giữ cùng tọa độ với nhân vật; từng hạng đổi cấu tạo chứ không chỉ đổi màu viền. */
export function TieredWearableArt({ defId, grade, finish }: Props): ReactNode {
  const rank = level[grade];
  switch (defId) {
    case "round-glasses":
      return <g className="tier-eyewear">
        <path d="M-14,-19 l-3,-2 M14,-19 l3,-2" fill="none" {...line} />
        <g className="glasses-lenses">
          <ellipse cx={-8} cy={-18} rx={rank === 0 ? 5.1 : 5.8} ry={rank === 0 ? 5.5 : 6} fill={rank === 0 ? "#C5D3CE" : "#E1F1EF"} {...line} />
          <ellipse cx={8} cy={-18} rx={rank === 0 ? 5.4 : 5.8} ry={rank === 0 ? 5.2 : 6} fill={rank === 0 ? "#C5D3CE" : "#E1F1EF"} {...line} />
          <path d="M-2,-19 Q0,-21 2,-19" fill="none" {...line} />
        </g>
        {rank === 0 && <path d="M-15,-21 l3,3 M-2,-18 l1,3" stroke="#A77962" strokeWidth={2} />}
        {rank >= 1 && <path d="M-11,-21 Q-8,-23 -5,-21 M5,-21 Q8,-23 11,-21" fill="none" stroke="#FFFDF6" strokeWidth={1} />}
        {rank >= 2 && <path d="M-14,-21 l2,-1 M12,-22 l2,1 M-1,-20 h2" fill="none" stroke={ART.honey} strokeWidth={1.5} strokeLinecap="round" />}
        {rank === 3 && <g className="glasses-shine" fill="none" stroke="#FFFDF6" strokeWidth={1.35} strokeLinecap="round"><path d="M-11,-21 l2,-2 M7,-21 l2,-2" /></g>}
        {finish >= 3 && <circle cx={-4} cy={-22} r={0.8} fill="#FFF7CA" />}
      </g>;
    case "care-pin":
      return <g className="tier-pin">
        {rank >= 2 && <path d="M-10,-19 l-3,-2 2,-3 M10,-19 l3,-2 -2,-3 M-10,-11 l-2,2 4,1 M10,-11 l2,2 -4,1" fill={rank === 3 ? ART.honey : "#A4C59B"} {...line} />}
        <circle cx={0} cy={-16} r={rank === 0 ? 8 : rank === 1 ? 9.5 : 10.5} fill={rank === 0 ? "#B89972" : rank === 1 ? "#63A583" : ART.leaf} {...line} />
        {rank >= 1 && <circle cx={0} cy={-16} r={rank === 1 ? 6.5 : 7.4} fill="none" stroke={rank === 3 ? "#F7CD70" : "#BDE2BA"} strokeWidth={rank === 3 ? 1.8 : 1} />}
        <path d="M0,-11 Q-6,-15 -5,-19 Q-2,-22 0,-18 Q2,-22 5,-19 Q6,-15 0,-11Z" fill={rank === 0 ? "#F3E1C1" : ART.paper} stroke={INK} strokeWidth={0.85} />
        {rank === 0 && <path d="M-7,-20 l2,-1" stroke="#715A4A" strokeWidth={1.2} />}
        {rank >= 2 && <path d="M-7,-22 Q0,-26 7,-22" fill="none" stroke="#D8EECF" strokeWidth={1.1} />}
        {rank === 3 && <circle className="pin-glow" cx={0} cy={-16} r={12.4} fill="none" stroke="#E9C567" strokeWidth={0.8} />}
      </g>;
    case "neck-bow":
      return <g className="tier-bow">
        {rank >= 2 && <g className="bow-tails"><path d="M-2,-14 L-7,-4 L-3,-6 L0,-3 L1,-14Z" fill="#C77868" {...line} /><path d="M2,-14 L7,-4 L3,-6 L0,-3 L-1,-14Z" fill="#D58D76" {...line} /></g>}
        <path d={rank === 0 ? "M-2,-16 L-12,-22 L-11,-10 Z" : "M-2,-16 Q-9,-25 -14,-23 L-12,-9 Q-7,-9 -2,-16Z"} fill={rank === 0 ? "#AD7770" : rank === 3 ? "#DE9278" : ART.coral} {...line} />
        <path d={rank === 0 ? "M2,-16 L11,-23 L12,-10 Z" : "M2,-16 Q9,-25 14,-23 L12,-9 Q7,-9 2,-16Z"} fill={rank === 0 ? "#B7887A" : rank === 3 ? "#DE9278" : ART.coral} {...line} />
        <circle cy={-16} r={rank === 0 ? 2.8 : 3.7} fill={rank === 3 ? ART.honey : "#DB9B84"} {...line} />
        {rank === 0 && <path d="M-10,-11 l-2,2" stroke={INK} strokeWidth={1} />}
        {rank >= 1 && <path d="M-11,-19 l7,3 M11,-19 l-7,3" fill="none" stroke="#F7BDA8" strokeWidth={1.2} />}
        {rank >= 2 && <path d="M-13,-21 l8,4 M13,-21 l-8,4" fill="none" stroke="#F6D4B8" strokeWidth={0.8} strokeDasharray="2 2" />}
        {rank === 3 && <circle cx={0} cy={-16} r={1.1} fill="#FFF7DB" />}
      </g>;
    case "flower-band": {
      const flowers = rank === 0 ? [[0, -22]] : rank === 1 ? [[-8, -18], [8, -18]] : rank === 2 ? [[-9, -18], [0, -23], [9, -18]] : [[-12, -15], [-7, -20], [0, -23], [7, -20], [12, -15]];
      return <g className="tier-flower-band">
        <path d="M-15,-6 Q0,-32 15,-6" fill="none" stroke={INK} strokeWidth={4.3} strokeLinecap="round" />
        <path d="M-15,-6 Q0,-32 15,-6" fill="none" stroke={rank === 0 ? "#87998A" : "#7EB38F"} strokeWidth={2.1} strokeLinecap="round" />
        <g className="band-flowers">{flowers.map(([x, y], i) => <Bloom key={i} x={x!} y={y!} color={rank === 0 ? "#D7AA9E" : i % 2 ? "#F1BAC8" : "#F2D27D"} small={rank === 0 || rank === 3 && i % 2 === 0} />)}</g>
        {rank >= 2 && <path d="M-13,-13 l-3,-2 M13,-13 l3,-2" stroke="#94C89B" strokeWidth={1.7} strokeLinecap="round" />}
      </g>;
    }
    case "cat-ears":
      return <g className="tier-cat-ears">
        <path d="M-16,-4 Q0,-19 16,-4" fill="none" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
        <path d="M-14,-10 L-12,-27 L-3,-16Z M14,-10 L12,-27 L3,-16Z" fill={rank === 0 ? "#616467" : rank === 3 ? "#3E5360" : "#46535B"} {...line} />
        {rank >= 1 && <path d="M-11,-14 L-10.5,-22 L-6,-16Z M11,-14 L10.5,-22 L6,-16Z" fill={rank === 1 ? "#C68E9C" : "#F2B8C6"} />}
        {rank >= 2 && <path d="M-13,-10 Q0,-18 13,-10" fill="none" stroke="#8FA69C" strokeWidth={1.2} strokeDasharray="2 2" />}
        {rank === 3 && <g className="cat-ear-tips"><path d="M-12,-27 l-1,-2 M12,-27 l1,-2" stroke={ART.honey} strokeWidth={1.3} /><circle cx={0} cy={-11} r={1.8} fill={ART.honey} {...line} /></g>}
        {rank === 0 && <path d="M-15,-7 l-2,-1" stroke="#5A4545" strokeWidth={1.1} />}
      </g>;
    case "beach-shades":
      return <g className="tier-shades">
        <path d="M-16,-20 l-2,-2 M16,-20 l2,-2" fill="none" {...line} />
        <rect x={-15} y={-23} width={13} height={rank === 0 ? 9 : 11} rx={rank >= 2 ? 4 : 3} fill={rank === 0 ? "#768080" : rank === 3 ? "#376476" : "#34505B"} {...line} />
        <rect x={2} y={-23} width={13} height={rank === 0 ? 9 : 11} rx={rank >= 2 ? 4 : 3} fill={rank === 0 ? "#768080" : rank === 3 ? "#376476" : "#34505B"} {...line} />
        <path d="M-2,-20 H2" fill="none" {...line} />
        {rank === 0 && <path d="M-15,-16 l3,3" stroke="#8A9693" strokeWidth={1.4} />}
        {rank >= 1 && <path d="M-12,-20 l4,4 M5,-20 l4,4" stroke="#8BB2BB" strokeWidth={1.2} />}
        {rank >= 2 && <path d="M-13,-23 h10 M3,-23 h10" stroke={rank === 3 ? ART.honey : "#D6B46B"} strokeWidth={1.1} />}
        {rank === 3 && <g className="shades-shine"><path d="M-11,-21 l3,3 M6,-21 l3,3" stroke="#D9F7F2" strokeWidth={1.1} /></g>}
      </g>;
    default:
      return null;
  }
}
